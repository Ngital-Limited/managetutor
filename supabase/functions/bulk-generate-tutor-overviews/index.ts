// Admin-only: Bulk-generate AI overviews for all tutor profiles missing one.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a marketing copywriter for a tuition marketplace in Bangladesh. Write a punchy, parent-facing overview of a tutor that highlights their strengths and makes parents want to hire them.

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

async function generateForTutor(admin: any, LOVABLE_API_KEY: string, tutorProfileId: string) {
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

  if (tpErr || !tp) return { ok: false, error: "not found" };

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
  };

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Tutor data:\n${JSON.stringify(profileSummary, null, 2)}` },
      ],
    }),
  });

  if (!aiResp.ok) {
    return { ok: false, error: `ai_${aiResp.status}`, status: aiResp.status };
  }
  const aiJson = await aiResp.json();
  const overview: string = aiJson.choices?.[0]?.message?.content?.trim() || "";
  if (!overview) return { ok: false, error: "empty" };

  const { error: updErr } = await admin
    .from("tutor_profiles")
    .update({ ai_overview: overview, ai_overview_updated_at: new Date().toISOString() })
    .eq("id", tutorProfileId);
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = claimsData.claims.sub;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const limit: number = Math.min(Math.max(Number(body.limit) || 25, 1), 100);
    const overwrite: boolean = !!body.overwrite;

    let q = admin.from("tutor_profiles").select("id, ai_overview").limit(limit);
    if (!overwrite) q = q.is("ai_overview", null);
    const { data: targets, error: tErr } = await q;
    if (tErr) {
      return new Response(JSON.stringify({ error: tErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let success = 0;
    let failed = 0;
    const errors: { id: string; error: string }[] = [];
    for (const t of targets || []) {
      const r = await generateForTutor(admin, LOVABLE_API_KEY, t.id);
      if (r.ok) success++;
      else {
        failed++;
        errors.push({ id: t.id, error: r.error || "unknown" });
        if ((r as any).status === 402 || (r as any).status === 429) break; // stop on credits/rate limits
      }
      // small delay to avoid bursting
      await new Promise((res) => setTimeout(res, 400));
    }

    return new Response(JSON.stringify({ processed: (targets || []).length, success, failed, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bulk-generate-tutor-overviews error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
