// Bulk import jobs from CSV. Admin-only. Processes a batch of rows.
// Each row may bring its own parent (matched/created by Gurdian Number).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobRow {
  title?: string;
  number_of_student?: string | number;
  class?: string;
  subject?: string;
  catagory?: string;
  category?: string;
  tution_type?: string;
  country?: string;
  division?: string;
  city?: string;
  address?: string;
  tution_days?: string | number;
  tution_time?: string;
  Salary?: string | number;
  salary?: string | number;
  "Student Gender"?: string;
  student_gender?: string;
  "Teacher Gender Requirement"?: string;
  teacher_gender?: string;
  "Gurdian Number"?: string;
  guardian_number?: string;
  status?: string;
  created_at?: string;
}

const clean = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s.toUpperCase() === "NULL") return null;
  return s;
};

function normalizePhone(p: any): string | null {
  const c = clean(p);
  if (!c) return null;
  // strip non-digits
  let d = c.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  // d should be 10 digits starting with 1
  if (/^1[3-9]\d{8}$/.test(d)) return "+880" + d;
  return null;
}

function mapGender(g: any): "male" | "female" | "any" {
  const c = clean(g)?.toLowerCase();
  if (c === "male") return "male";
  if (c === "female") return "female";
  return "any";
}

function mapStudentGender(g: any): "male" | "female" | null {
  const c = clean(g)?.toLowerCase();
  if (c === "male") return "male";
  if (c === "female") return "female";
  return null;
}

// Map source class string to canonical class_level
function mapClassLevel(c: any): string | null {
  const v = clean(c);
  if (!v) return null;
  const lower = v.toLowerCase();
  // Multi-class like "710" → first match
  const num = v.match(/\d+/)?.[0];
  if (lower.includes("admission")) return "Admission Test";
  if (lower.includes("o level")) return "O Level";
  if (lower.includes("a level")) return "A Level - AS";
  if (lower.includes("hsc") || num === "12") return "Class 12 (HSC)";
  if (num === "11") return "Class 11";
  if (lower.includes("ssc") || num === "10") return "Class 10 (SSC)";
  if (num && parseInt(num) >= 1 && parseInt(num) <= 9) return `Class ${num}`;
  return v;
}

function mapStatus(s: any): "open" | "pending_approval" | "closed" {
  const c = clean(s)?.toLowerCase();
  if (c === "approved") return "open";
  return "pending_approval";
}

function buildAddress(r: JobRow): string {
  return [clean(r.address), clean(r.city), clean(r.division)].filter(Boolean).join(", ");
}

function parseSalary(r: JobRow): { min: number | null; max: number | null } {
  const s = clean(r.Salary ?? r.salary);
  if (!s) return { min: null, max: null };
  const n = parseInt(s.replace(/[^\d]/g, ""));
  if (!isNaN(n) && n > 0) return { min: n, max: n };
  return { min: null, max: null };
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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const rows: JobRow[] = body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows required" }), { status: 400, headers: corsHeaders });
    }
    if (rows.length > 100) {
      return new Response(JSON.stringify({ error: "Max 100 rows per batch" }), { status: 400, headers: corsHeaders });
    }

    // Load lookups
    const { data: districtsData } = await admin.from("districts").select("id, name_en");
    const { data: areasData } = await admin.from("areas").select("id, name_en, district_id");
    const { data: subjectsData } = await admin.from("subjects").select("id, name_en");

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const districts = (districtsData || []).map((d) => ({ id: d.id, key: norm(d.name_en), name: d.name_en }));
    const areas = (areasData || []).map((a) => ({ id: a.id, district_id: a.district_id, key: norm(a.name_en), name: a.name_en }));
    const subjects = (subjectsData || []).map((s) => ({ id: s.id, key: norm(s.name_en), name: s.name_en }));
    areas.sort((a, b) => b.key.length - a.key.length);
    districts.sort((a, b) => b.key.length - a.key.length);

    function findDistrict(name?: string | null): string | null {
      const t = clean(name);
      if (!t) return null;
      const nt = norm(t);
      for (const d of districts) if (d.key === nt) return d.id;
      for (const d of districts) if (nt.includes(d.key) && d.key.length >= 3) return d.id;
      return null;
    }
    function findArea(name?: string | null, districtId?: string | null): string | null {
      const t = clean(name);
      if (!t) return null;
      const nt = norm(t);
      const pool = districtId ? areas.filter((a) => a.district_id === districtId) : areas;
      for (const a of pool) if (a.key === nt) return a.id;
      for (const a of pool) if (a.key.length >= 3 && nt.includes(a.key)) return a.id;
      return null;
    }
    function matchSubjectIds(text?: string | null): string[] {
      const t = clean(text);
      if (!t) return [];
      // split on common separators
      const tokens = t.split(/[,&/|;]+|\band\b/i).map((s) => s.trim()).filter(Boolean);
      const found = new Set<string>();
      for (const tok of tokens) {
        const nt = norm(tok);
        if (!nt) continue;
        // exact first
        const exact = subjects.find((s) => s.key === nt);
        if (exact) { found.add(exact.id); continue; }
        // contains
        const partial = subjects.find((s) => s.key.length >= 4 && (nt.includes(s.key) || s.key.includes(nt)));
        if (partial) found.add(partial.id);
      }
      return Array.from(found);
    }

    const results = { imported: 0, skipped: 0, errors: 0, details: [] as any[] };

    // cache parents created/found this batch by phone
    const parentCache = new Map<string, string>();

    async function getOrCreateParent(phone: string): Promise<string | null> {
      if (parentCache.has(phone)) return parentCache.get(phone)!;
      // Try existing profile by phone
      const { data: existing } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
      if (existing?.id) {
        parentCache.set(phone, existing.id);
        return existing.id;
      }
      // Create new auth user with synthetic email
      const local = phone.replace(/\D/g, "");
      const email = `parent_${local}@imported.managetutor.com`;
      const { data: byEmail } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      if (byEmail?.id) {
        parentCache.set(phone, byEmail.id);
        return byEmail.id;
      }
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + "Aa1!",
        email_confirm: true,
        user_metadata: { full_name: `Parent ${local.slice(-4)}` },
      });
      if (createErr || !created?.user) return null;
      const uid = created.user.id;
      await admin.from("profiles").update({ phone, full_name: `Parent ${local.slice(-4)}`, is_approved: true }).eq("id", uid);
      await admin.from("user_roles").insert({ user_id: uid, role: "parent" });
      parentCache.set(phone, uid);
      return uid;
    }

    for (const r of rows) {
      const title = clean(r.title);
      if (!title) {
        results.skipped++;
        results.details.push({ ref: "(no title)", status: "skipped", reason: "no title" });
        continue;
      }

      try {
        const phone = normalizePhone(r["Gurdian Number"] ?? r.guardian_number);
        let parentId: string | null = null;
        if (phone) parentId = await getOrCreateParent(phone);
        if (!parentId) parentId = callerId; // fallback to admin

        const districtId = findDistrict(r.division) || findDistrict(r.city);
        if (!districtId) {
          results.skipped++;
          results.details.push({ ref: title, status: "skipped", reason: `district not found: ${r.division || r.city}` });
          continue;
        }
        const areaId = findArea(r.city, districtId);

        const { min, max } = parseSalary(r);
        const subjectIds = matchSubjectIds(r.subject);
        const days = parseInt(String(clean(r.tution_days) || "")) || null;
        const numStudents = parseInt(String(clean(r.number_of_student) || "1")) || 1;

        const teachingMode = clean(r.tution_type)?.toLowerCase().includes("online") ? "online" : "in_person";

        const description = [
          clean(r.subject) && `Subjects: ${clean(r.subject)}`,
          clean(r.catagory ?? r.category) && `Medium: ${clean(r.catagory ?? r.category)}`,
          clean(r.address) && `Address: ${clean(r.address)}`,
          numStudents && `Students: ${numStudents}`,
          days && `Days/week: ${days}`,
          clean(r.tution_time) && `Preferred time: ${clean(r.tution_time)}`,
        ].filter(Boolean).join("\n");

        const insertPayload: any = {
          parent_id: parentId,
          title,
          description: description || title,
          district_id: districtId,
          area_id: areaId,
          class_level: mapClassLevel(r.class),
          number_of_students: numStudents,
          days_per_week: days,
          preferred_time: clean(r.tution_time),
          location_details: buildAddress(r),
          budget_min: min,
          budget_max: max,
          teaching_mode: teachingMode,
          student_gender: mapStudentGender(r["Student Gender"] ?? r.student_gender),
          preferred_tutor_gender: mapGender(r["Teacher Gender Requirement"] ?? r.teacher_gender),
          status: mapStatus(r.status),
          subject_id: subjectIds[0] || null,
        };

        const { data: jobData, error: jobErr } = await admin.from("jobs").insert(insertPayload).select("id, job_reference").single();
        if (jobErr || !jobData) {
          results.errors++;
          results.details.push({ ref: title, status: "error", reason: `job: ${jobErr?.message || "insert failed"}` });
          continue;
        }

        if (subjectIds.length) {
          const links = subjectIds.map((sid) => ({ job_id: jobData.id, subject_id: sid }));
          await admin.from("job_subjects").insert(links);
        }

        results.imported++;
        results.details.push({ ref: jobData.job_reference || title, status: "imported" });
      } catch (e) {
        results.errors++;
        results.details.push({ ref: title, status: "error", reason: (e as Error).message });
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
