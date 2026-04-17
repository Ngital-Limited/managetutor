// Generate marketing-style AI overview for a tutor profile.
// Auth: any authenticated user can call for THEIR own tutor profile, admins for any.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub;

    const body = await req.json().catch(() => ({}));
    const tutorProfileId: string | undefined = body.tutor_profile_id;
    if (!tutorProfileId) {
      return new Response(JSON.stringify({ error: "tutor_profile_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch tutor profile + related data
    const { data: tp, error: tpErr } = await admin
      .from("tutor_profiles")
      .select(`
        id, user_id, bio, education_detail, experience_years, teaching_philosophy,
        success_stories, monthly_salary_min, monthly_salary_max, teaching_mode,
        class_levels, gender, average_rating, total_reviews,
        profiles:user_id ( full_name ),
        districts:district_id ( name_en ),
        tutor_education ( degree, institution, field_of_study, passing_year, result, current_semester, is_current ),
        tutor_subjects ( subjects ( name_en ) )
      `)
      .eq("id", tutorProfileId)
      .maybeSingle();

    if (tpErr || !tp) {
      return new Response(JSON.stringify({ error: "Tutor profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: owner or admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;
    if (!isAdmin && tp.user_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reviews (recent approved)
    const { data: reviews } = await admin
      .from("reviews")
      .select("rating, comment")
      .eq("tutor_id", tutorProfileId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(5);

    const subjects = (tp.tutor_subjects || []).map((s: any) => s.subjects?.name_en).filter(Boolean);
    const eduList = (tp.tutor_education || []).map((e: any) =>
      `${e.degree}${e.field_of_study ? " in " + e.field_of_study : ""} at ${e.institution}${e.passing_year ? " (" + e.passing_year + ")" : e.is_current ? " (current)" : ""}${e.result ? " — " + e.result : ""}`
    );

    const profileSummary = {
      name: (tp.profiles as any)?.full_name,
      district: (tp.districts as any)?.name_en,
      gender: tp.gender,
      experience_years: tp.experience_years,
      class_levels: tp.class_levels || [],
      subjects,
      education: eduList,
      education_detail: tp.education_detail,
      teaching_philosophy: tp.teaching_philosophy,
      success_stories: tp.success_stories,
      bio: tp.bio,
      teaching_mode: tp.teaching_mode,
      monthly_salary_range: tp.monthly_salary_min && tp.monthly_salary_max
        ? `৳${tp.monthly_salary_min}-${tp.monthly_salary_max}`
        : null,
      average_rating: tp.average_rating,
      total_reviews: tp.total_reviews,
      recent_reviews: (reviews || []).map((r) => ({ rating: r.rating, comment: r.comment })),
    };

    const systemPrompt = `You are a marketing copywriter for a tuition marketplace in Bangladesh. Write a punchy, parent-facing overview of a tutor that highlights their strengths and makes parents want to hire them.

STRICT FORMAT:
- One bold hero paragraph (2-3 sentences) selling the tutor.
- Then 4-6 bullet highlights covering: education credentials, teaching experience, subjects/levels, teaching style, notable achievements, and what makes them stand out.
- End with a short closing line encouraging parents to book a demo.

Rules:
- Use plain text with simple bullet points (use "• " prefix). No markdown headings.
- No emojis. No hashtags.
- Be specific — reference actual schools, subjects, years from the data.
- Do NOT invent facts. If a field is missing, skip it gracefully.
- Keep total length under 220 words.
- Write in English.`;

    const userPrompt = `Tutor data:\n${JSON.stringify(profileSummary, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Lovable workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const overview: string = aiJson.choices?.[0]?.message?.content?.trim() || "";
    if (!overview) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin
      .from("tutor_profiles")
      .update({ ai_overview: overview, ai_overview_updated_at: new Date().toISOString() })
      .eq("id", tutorProfileId);
    if (updErr) {
      return new Response(JSON.stringify({ error: `Save failed: ${updErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ overview }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tutor-overview error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
