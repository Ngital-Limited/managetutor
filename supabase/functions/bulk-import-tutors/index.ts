// Bulk import tutors from CSV. Admin-only. Processes a batch of rows.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TutorRow {
  fname?: string; lname?: string; email: string; phone?: string;
  alt_phone?: string; f_phone?: string; m_phone?: string;
  p_address?: string; per_address?: string; gender?: string;
  school?: string; college?: string; university?: string; department?: string;
  t_experience?: string; background?: string; medium?: string;
  fb_link?: string; pre_class?: string; pre_subject?: string; pre_area?: string;
  status?: string; photo?: string;
}

const clean = (v?: string) => (v && v !== "NULL" && v.trim() !== "" ? v.trim() : null);

function buildBio(r: TutorRow): string {
  const parts: string[] = [];
  if (clean(r.t_experience)) parts.push(`Experience: ${clean(r.t_experience)}`);
  if (clean(r.background)) parts.push(`Background: ${clean(r.background)}`);
  if (clean(r.medium)) parts.push(`Medium: ${clean(r.medium)}`);
  if (clean(r.pre_class)) parts.push(`Preferred Classes: ${clean(r.pre_class)}`);
  if (clean(r.pre_subject)) parts.push(`Preferred Subjects: ${clean(r.pre_subject)}`);
  if (clean(r.pre_area)) parts.push(`Preferred Areas: ${clean(r.pre_area)}`);
  const edu = [r.school, r.college, r.university, r.department].map(clean).filter(Boolean);
  if (edu.length) parts.push(`Education: ${edu.join(" | ")}`);
  if (clean(r.p_address)) parts.push(`Present: ${clean(r.p_address)}`);
  if (clean(r.per_address)) parts.push(`Permanent: ${clean(r.per_address)}`);
  const contacts = [
    clean(r.alt_phone) && `Alt: ${clean(r.alt_phone)}`,
    clean(r.f_phone) && `Father: ${clean(r.f_phone)}`,
    clean(r.m_phone) && `Mother: ${clean(r.m_phone)}`,
  ].filter(Boolean);
  if (contacts.length) parts.push(contacts.join(" | "));
  if (clean(r.fb_link)) parts.push(`FB: ${clean(r.fb_link)}`);
  return parts.join("\n");
}

function buildEducationDetail(r: TutorRow): string | null {
  const edu = [r.school, r.college, r.university, r.department].map(clean).filter(Boolean);
  return edu.length ? edu.join(" | ") : null;
}

function normalizePhone(p?: string): string | null {
  const c = clean(p);
  if (!c) return null;
  if (/^01[3-9]\d{8}$/.test(c)) return c;
  return null; // store invalid as null
}

function normalizeGender(g?: string): "male" | "female" {
  const c = clean(g)?.toLowerCase();
  if (c === "female") return "female";
  return "male";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const callerId = claimsData.claims.sub;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const rows: TutorRow[] = body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows required" }), { status: 400, headers: corsHeaders });
    }
    if (rows.length > 100) {
      return new Response(JSON.stringify({ error: "Max 100 rows per batch" }), { status: 400, headers: corsHeaders });
    }

    // Load districts + areas once for fuzzy matching
    const { data: districtsData } = await admin.from("districts").select("id, name_en");
    const { data: areasData } = await admin.from("areas").select("id, name_en, district_id");

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const districts = (districtsData || []).map((d) => ({ id: d.id, key: norm(d.name_en), name: d.name_en }));
    const areas = (areasData || []).map((a) => ({ id: a.id, district_id: a.district_id, key: norm(a.name_en), name: a.name_en }));
    // Sort longer names first so "Mirpur 10" matches before "Mirpur"
    areas.sort((a, b) => b.key.length - a.key.length);
    districts.sort((a, b) => b.key.length - a.key.length);

    function matchLocation(text?: string | null): { district_id: string | null; area_id: string | null } {
      const t = clean(text);
      if (!t) return { district_id: null, area_id: null };
      const nt = norm(t);
      if (!nt) return { district_id: null, area_id: null };
      // Try area substring match first
      for (const a of areas) {
        if (a.key.length >= 3 && nt.includes(a.key)) {
          return { district_id: a.district_id, area_id: a.id };
        }
      }
      // Then district
      for (const d of districts) {
        if (d.key.length >= 3 && nt.includes(d.key)) {
          return { district_id: d.id, area_id: null };
        }
      }
      return { district_id: null, area_id: null };
    }

    const results = { imported: 0, skipped: 0, errors: 0, details: [] as any[] };

    for (const r of rows) {
      const email = clean(r.email)?.toLowerCase();
      if (!email) {
        results.skipped++;
        results.details.push({ email: r.email, status: "skipped", reason: "no email" });
        continue;
      }

      try {
        // Skip if email already exists
        const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
        if (existing) {
          results.skipped++;
          results.details.push({ email, status: "skipped", reason: "email exists" });
          continue;
        }

        const fullName = [clean(r.fname), clean(r.lname)].filter(Boolean).join(" ") || email.split("@")[0];

        // Create auth user
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: crypto.randomUUID() + "Aa1!",
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (createErr || !created?.user) {
          results.errors++;
          results.details.push({ email, status: "error", reason: createErr?.message || "createUser failed" });
          continue;
        }

        const uid = created.user.id;
        const phone = normalizePhone(r.phone);
        const loc = matchLocation([r.pre_area, r.p_address, r.per_address].filter(Boolean).join(" "));

        // handle_new_user trigger creates profiles row. Update it.
        const { error: profErr } = await admin
          .from("profiles")
          .update({
            full_name: fullName,
            phone,
            email_verified: true,
            is_approved: true, // imported tutors are pre-approved
            district_id: loc.district_id,
            area_id: loc.area_id,
          })
          .eq("id", uid);
        if (profErr) {
          results.errors++;
          results.details.push({ email, status: "error", reason: `profile: ${profErr.message}` });
          continue;
        }

        // Role
        const { error: roleErr } = await admin.from("user_roles").insert({ user_id: uid, role: "tutor" });
        if (roleErr) {
          results.errors++;
          results.details.push({ email, status: "error", reason: `role: ${roleErr.message}` });
          continue;
        }

        // Tutor profile
        const verification_status = "approved"; // imported tutors auto-approved
        const { error: tpErr } = await admin.from("tutor_profiles").insert({
          user_id: uid,
          gender: normalizeGender(r.gender),
          bio: buildBio(r) || null,
          education_detail: buildEducationDetail(r),
          district_id: loc.district_id,
          present_address: clean(r.p_address),
          permanent_address: clean(r.per_address),
          father_phone: normalizePhone(r.f_phone),
          mother_phone: normalizePhone(r.m_phone),
          emergency_contact_phone: normalizePhone(r.alt_phone),
          verification_status,
          is_available: true,
          is_student: clean(r.university) ? true : false,
        });
        if (tpErr) {
          results.errors++;
          results.details.push({ email, status: "error", reason: `tutor_profile: ${tpErr.message}` });
          continue;
        }

        results.imported++;
        results.details.push({ email, status: "imported", uid });
      } catch (e) {
        results.errors++;
        results.details.push({ email, status: "error", reason: (e as Error).message });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
