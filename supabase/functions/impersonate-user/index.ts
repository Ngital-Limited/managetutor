import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserId = userData.user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { targetUserId } = await req.json();
    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(
        JSON.stringify({ error: "targetUserId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: targetRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (targetRole) {
      return new Response(
        JSON.stringify({ error: "Cannot impersonate another admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to fetch the target auth user
    let targetEmail: string | null = null;
    const { data: targetUser } = await adminClient.auth.admin.getUserById(targetUserId);

    if (targetUser?.user) {
      targetEmail = targetUser.user.email ?? null;
    } else {
      // No auth user — fetch the profile to recover email/full name
      const { data: prof } = await adminClient
        .from("profiles")
        .select("id, email, full_name, phone")
        .eq("id", targetUserId)
        .maybeSingle();

      if (!prof) {
        return new Response(
          JSON.stringify({ error: "Target user not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a usable email if the stored one is a placeholder
      const safeEmail = prof.email && !prof.email.endsWith("@placeholder.local")
        ? prof.email
        : `user-${targetUserId.slice(0, 8)}@managetutor.local`;

      // Create an auth user with the EXACT same id as the profile so RLS keeps working
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        id: targetUserId,
        email: safeEmail,
        email_confirm: true,
        user_metadata: { full_name: prof.full_name },
        password: crypto.randomUUID(),
      } as any);

      if (createErr || !created?.user) {
        console.error("createUser error:", createErr);
        return new Response(
          JSON.stringify({ error: "This account has no login credentials and could not be auto-provisioned. Please reset the user from Cloud → Users." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sync profile email if it was a placeholder
      if (prof.email !== safeEmail) {
        await adminClient.from("profiles").update({ email: safeEmail }).eq("id", targetUserId);
      }

      targetEmail = safeEmail;
    }

    if (!targetEmail) {
      return new Response(
        JSON.stringify({ error: "Target user has no email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: generatedLink, error: genError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });

    if (genError || !generatedLink) {
      console.error("Generate link error:", genError);
      return new Response(
        JSON.stringify({ error: "Failed to generate impersonation session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenHash = generatedLink.properties?.hashed_token;
    if (!tokenHash) {
      return new Response(
        JSON.stringify({ error: "Failed to generate token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifyClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: sessionData, error: verifyError } = await verifyClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (verifyError || !sessionData?.session) {
      console.error("Verify OTP error:", verifyError);
      return new Response(
        JSON.stringify({ error: "Failed to create impersonation session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userRoleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("full_name, avatar_url, phone")
      .eq("id", targetUserId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        session: sessionData.session,
        role: userRoleData?.role || "parent",
        profile: profileData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Impersonation error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
