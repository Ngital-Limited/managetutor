import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Find expired featured listings that are still active
    const { data: expiredListings, error: fetchError } = await supabase
      .from("featured_listings")
      .select("id, tutor_id")
      .eq("is_active", true)
      .lt("end_date", now);

    if (fetchError) throw fetchError;

    if (!expiredListings || expiredListings.length === 0) {
      return new Response(JSON.stringify({ message: "No expired listings found", expired: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Deactivate expired listings
    const expiredIds = expiredListings.map((l) => l.id);
    const { error: updateError } = await supabase
      .from("featured_listings")
      .update({ is_active: false })
      .in("id", expiredIds);

    if (updateError) throw updateError;

    // Reset is_featured on tutor profiles that have no other active listings
    const tutorIds = [...new Set(expiredListings.map((l) => l.tutor_id).filter(Boolean))];

    for (const tutorId of tutorIds) {
      // Check if tutor has any other active featured listing
      const { data: activeListings } = await supabase
        .from("featured_listings")
        .select("id")
        .eq("tutor_id", tutorId)
        .eq("is_active", true)
        .gt("end_date", now)
        .limit(1);

      if (!activeListings || activeListings.length === 0) {
        await supabase
          .from("tutor_profiles")
          .update({ is_featured: false })
          .eq("id", tutorId);
      }
    }

    console.log(`Expired ${expiredIds.length} listings, checked ${tutorIds.length} tutors`);

    return new Response(
      JSON.stringify({ message: "Success", expired: expiredIds.length, tutorsChecked: tutorIds.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error expiring listings:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
