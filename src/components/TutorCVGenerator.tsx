import { supabase } from '@/integrations/supabase/client';

interface TutorCVData {
  fullName: string;
  email: string;
  phone: string | null;
  userReference: string | null;
  avatarUrl: string | null;
  bio: string | null;
  education: string | null;
  educationDetail: string | null;
  experienceYears: number;
  gender: string;
  teachingMode: string | null;
  monthlySalaryMin: number | null;
  monthlySalaryMax: number | null;
  totalStudents: number;
  verificationStatus: string;
  teachingPhilosophy: string | null;
  successStories: string | null;
  subjects: string[];
  classLevels: string[];
  districtName: string | null;
  presentAddress: string | null;
  educationEntries: { degree: string; institution: string; field_of_study: string | null; passing_year: number | null; result: string | null }[];
  experiences: { designation: string; company: string; start_date: string | null; end_date: string | null; is_current: boolean | null; responsibilities: string | null }[];
}

export async function generateTutorCV(userId: string): Promise<void> {
  const [profileRes, tutorRes] = await Promise.all([
    supabase.from('profiles').select('full_name, email, phone, user_reference, avatar_url, district_id, districts(name_en)').eq('id', userId).single(),
    supabase.from('tutor_profiles').select('*').eq('user_id', userId).single(),
  ]);

  if (!profileRes.data || !tutorRes.data) throw new Error('Profile not found');

  const tutor = tutorRes.data;
  const profile = profileRes.data as any;

  const [{ data: subjectsData }, { data: eduData }, { data: expData }] = await Promise.all([
    supabase.from('tutor_subjects').select('subjects(name_en)').eq('tutor_profile_id', tutor.id),
    supabase.from('tutor_education').select('degree, institution, field_of_study, passing_year, result').eq('tutor_id', tutor.id),
    supabase.from('tutor_job_experiences').select('designation, company, start_date, end_date, is_current, responsibilities').eq('tutor_id', tutor.id).order('start_date', { ascending: false }),
  ]);

  const subjects = subjectsData?.map((s: any) => s.subjects?.name_en).filter(Boolean) || [];

  const data: TutorCVData = {
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    userReference: profile.user_reference,
    avatarUrl: profile.avatar_url,
    bio: tutor.bio,
    education: tutor.education,
    educationDetail: tutor.education_detail,
    experienceYears: tutor.experience_years || 0,
    gender: tutor.gender,
    teachingMode: tutor.teaching_mode,
    monthlySalaryMin: tutor.monthly_salary_min,
    monthlySalaryMax: tutor.monthly_salary_max,
    totalStudents: tutor.total_students || 0,
    verificationStatus: tutor.verification_status || 'pending',
    teachingPhilosophy: tutor.teaching_philosophy,
    successStories: tutor.success_stories,
    subjects,
    classLevels: tutor.class_levels || [],
    districtName: profile.districts?.name_en || null,
    presentAddress: tutor.present_address,
    educationEntries: (eduData || []).filter((e: any) => e.institution?.trim()).map((e: any) => ({
      degree: e.degree,
      institution: e.institution,
      field_of_study: e.field_of_study,
      passing_year: e.passing_year,
      result: e.result,
    })),
    experiences: (expData || []).filter((e: any) => e.company?.trim() && e.designation?.trim()),
  };

  openCVPrintWindow(data);
}

function fmtDate(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function openCVPrintWindow(data: TutorCVData) {
  const win = window.open('', '_blank');
  if (!win) return;

  const teachingModeLabel = data.teachingMode === 'in_person' ? 'In-Person' : data.teachingMode === 'online' ? 'Online' : data.teachingMode === 'hybrid' ? 'Hybrid' : 'N/A';
  const verified = data.verificationStatus === 'approved';

  const initials = data.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const eduLabels: Record<string, string> = { SSC: 'Secondary School Certificate', HSC: 'Higher School Certificate', Bachelor: 'Bachelor', Masters: 'Masters' };
  const FIXED = ['SSC', 'HSC', 'Bachelor', 'Masters'];
  const orderedEdu = FIXED.map(deg => ({ deg, e: data.educationEntries.find(e => (e.degree || '').toLowerCase() === deg.toLowerCase()) })).filter(x => x.e);

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${data.fullName} - Tutor CV</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #e5e7eb; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.5; }
  .page { width: 210mm; min-height: 297mm; margin: 16px auto; background: #fff; display: grid; grid-template-columns: 1fr 75mm; box-shadow: 0 4px 16px rgba(0,0,0,.08); }
  .main { padding: 18mm 12mm 18mm 14mm; }
  .side { background: #1f3a5f; color: #e8eef7; padding: 18mm 10mm; }

  /* Header */
  .name { font-size: 30px; font-weight: 800; color: #1f3a5f; letter-spacing: 1px; text-transform: uppercase; }
  .title { font-size: 14px; color: #4b5563; margin-top: 4px; }
  .contact { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; font-size: 12px; color: #374151; }
  .contact span { display: inline-flex; align-items: center; gap: 5px; }
  .contact .ic { color: #6b7280; }

  /* Sections - main */
  .sec { margin-top: 18px; }
  .sec h2 { font-size: 13px; color: #1f3a5f; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; padding-bottom: 4px; border-bottom: 1px solid #d1d5db; margin-bottom: 10px; }
  .sec p { font-size: 12.5px; color: #374151; }

  .exp-item { margin-bottom: 12px; }
  .exp-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .exp-role { font-size: 14px; font-weight: 600; color: #111827; }
  .exp-date { font-size: 11.5px; color: #6b7280; }
  .exp-company { display: flex; justify-content: space-between; font-size: 13px; color: #1f3a5f; font-weight: 500; margin-top: 1px; }
  .exp-loc { font-size: 11.5px; color: #6b7280; font-weight: normal; }
  .exp-bullets { padding-left: 16px; margin-top: 4px; }
  .exp-bullets li { font-size: 12px; color: #374151; margin-bottom: 2px; }

  .edu-item { margin-bottom: 8px; }
  .edu-row1 { display: flex; justify-content: space-between; align-items: baseline; }
  .edu-deg { font-size: 13.5px; font-weight: 600; color: #111827; }
  .edu-meta { font-size: 11.5px; color: #6b7280; }
  .edu-inst { font-size: 12.5px; color: #1f3a5f; }

  /* Sidebar */
  .avatar-wrap { display: flex; justify-content: center; margin-bottom: 18px; }
  .avatar { width: 105px; height: 105px; border-radius: 50%; background: #fff; color: #1f3a5f; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 700; overflow: hidden; border: 3px solid #fff; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }

  .side h2 { font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #fff; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,.25); margin-bottom: 10px; }
  .side .sec { margin-top: 18px; }
  .side .sec:first-of-type { margin-top: 0; }

  .achv { margin-bottom: 12px; }
  .achv-title { display: flex; align-items: flex-start; gap: 6px; font-size: 12.5px; font-weight: 600; color: #fff; }
  .achv-title .star { color: #fbbf24; }
  .achv-desc { font-size: 11.5px; color: #cbd5e1; margin-top: 3px; padding-left: 14px; }

  .skill-item { font-size: 12.5px; color: #e8eef7; padding: 4px 0; border-bottom: 1px dotted rgba(255,255,255,.2); }
  .skill-item:last-child { border-bottom: none; }

  .pill { display: inline-block; background: rgba(255,255,255,.12); color: #fff; padding: 3px 9px; border-radius: 10px; font-size: 11px; margin: 2px 3px 2px 0; }

  .verified-badge { display: inline-block; background: #10b981; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 10px; vertical-align: middle; margin-left: 8px; font-weight: 600; letter-spacing: .5px; }

  /* Print */
  .print-bar { position: fixed; top: 16px; right: 16px; z-index: 99; }
  .print-btn { padding: 10px 22px; background: #1f3a5f; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.15); font-weight: 600; }
  .print-btn:hover { background: #16294a; }

  @media print {
    html, body { background: #fff; }
    .page { box-shadow: none; margin: 0; width: 100%; min-height: auto; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 0; }
  }
</style></head><body>
<div class="print-bar no-print"><button class="print-btn" onclick="window.print()">📄 Download / Print CV</button></div>

<div class="page">
  <!-- LEFT: MAIN CONTENT -->
  <div class="main">
    <div class="name">${data.fullName}${verified ? '<span class="verified-badge">VERIFIED</span>' : ''}</div>
    <div class="title">Private Tutor${data.subjects.length ? ` | ${data.subjects.slice(0, 3).join(' | ')}` : ''}</div>
    <div class="contact">
      ${data.phone ? `<span><span class="ic">📞</span>${data.phone}</span>` : ''}
      <span><span class="ic">@</span>${data.email}</span>
      ${data.userReference ? `<span><span class="ic">🆔</span>${data.userReference}</span>` : ''}
      ${data.districtName || data.presentAddress ? `<span><span class="ic">📍</span>${data.presentAddress || data.districtName}</span>` : ''}
    </div>

    ${data.experiences.length > 0 ? `
    <div class="sec">
      <h2>Experience</h2>
      ${data.experiences.map(ex => `
        <div class="exp-item">
          <div class="exp-row">
            <div class="exp-role">${ex.designation}</div>
            <div class="exp-date">${fmtDate(ex.start_date)}${ex.start_date ? ' - ' : ''}${ex.is_current ? 'Present' : fmtDate(ex.end_date)}</div>
          </div>
          <div class="exp-company"><span>${ex.company}</span></div>
          ${ex.responsibilities ? `<ul class="exp-bullets">${ex.responsibilities.split('\n').filter(l => l.trim()).map(l => `<li>${l.replace(/^[-•·]\s*/, '')}</li>`).join('')}</ul>` : ''}
        </div>
      `).join('')}
    </div>` : (data.teachingPhilosophy ? `
    <div class="sec">
      <h2>Teaching Philosophy</h2>
      <p>${data.teachingPhilosophy}</p>
    </div>` : '')}

    ${orderedEdu.length > 0 || data.education ? `
    <div class="sec">
      <h2>Education</h2>
      ${orderedEdu.length > 0 ? orderedEdu.map(({ deg, e }) => `
        <div class="edu-item">
          <div class="edu-row1">
            <div class="edu-deg">${eduLabels[deg] || deg}</div>
            <div class="edu-meta">${e!.passing_year || ''}</div>
          </div>
          <div class="edu-inst">${e!.institution}${e!.field_of_study ? ` · ${e!.field_of_study}` : ''}${e!.result ? ` · ${e!.result}` : ''}</div>
        </div>
      `).join('') : `<p>${data.education}${data.educationDetail ? ` — ${data.educationDetail}` : ''}</p>`}
    </div>` : ''}

    ${data.successStories ? `
    <div class="sec">
      <h2>Success Stories</h2>
      <p>${data.successStories}</p>
    </div>` : ''}
  </div>

  <!-- RIGHT: SIDEBAR -->
  <div class="side">
    <div class="avatar-wrap">
      <div class="avatar">
        ${data.avatarUrl ? `<img src="${data.avatarUrl}" alt="${data.fullName}" onerror="this.parentNode.innerHTML='${initials}'"/>` : initials}
      </div>
    </div>

    <div class="sec">
      <h2>Key Highlights</h2>
      <div class="achv">
        <div class="achv-title"><span class="star">★</span> ${data.experienceYears} Years Teaching Experience</div>
        <div class="achv-desc">Proven track record across diverse learning environments and student levels.</div>
      </div>
      <div class="achv">
        <div class="achv-title"><span class="star">★</span> ${data.totalStudents}+ Students Mentored</div>
        <div class="achv-desc">Dedicated tutoring with personalized learning approach and measurable outcomes.</div>
      </div>
      ${verified ? `
      <div class="achv">
        <div class="achv-title"><span class="star">★</span> Platform Verified Tutor</div>
        <div class="achv-desc">Identity and credentials verified by Manage Tutor administration team.</div>
      </div>` : ''}
      ${data.teachingMode ? `
      <div class="achv">
        <div class="achv-title"><span class="star">★</span> ${teachingModeLabel} Teaching Mode</div>
        <div class="achv-desc">Flexible delivery format to suit each student's learning preference and schedule.</div>
      </div>` : ''}
    </div>

    ${data.subjects.length > 0 ? `
    <div class="sec">
      <h2>Subjects</h2>
      ${data.subjects.map(s => `<div class="skill-item">• ${s}</div>`).join('')}
    </div>` : ''}

    ${data.classLevels.length > 0 ? `
    <div class="sec">
      <h2>Class Levels</h2>
      <div>${data.classLevels.map(c => `<span class="pill">${c}</span>`).join('')}</div>
    </div>` : ''}

    ${data.monthlySalaryMin || data.monthlySalaryMax ? `
    <div class="sec">
      <h2>Expected Salary</h2>
      <div style="font-size:14px;color:#fff;font-weight:600">৳${data.monthlySalaryMin || '—'} – ${data.monthlySalaryMax || '—'}</div>
      <div style="font-size:11px;color:#cbd5e1;margin-top:2px">per month</div>
    </div>` : ''}

    <div class="sec">
      <h2>Personal</h2>
      ${data.gender ? `<div class="skill-item">Gender: ${data.gender.charAt(0).toUpperCase() + data.gender.slice(1)}</div>` : ''}
      ${data.districtName ? `<div class="skill-item">District: ${data.districtName}</div>` : ''}
    </div>
  </div>
</div>

<div style="width:210mm;margin:0 auto;padding:8px 14mm;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;background:#fff;">
  <span>Powered by <strong style="color:#1f3a5f;">Manage Tutor</strong></span>
  <a href="https://managetutor.com" style="color:#1f3a5f;text-decoration:none;">managetutor.com</a>
</div>

</body></html>`;

  win.document.write(html);
  win.document.close();
}
