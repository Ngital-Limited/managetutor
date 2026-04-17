import { supabase } from '@/integrations/supabase/client';

interface TutorCVData {
  fullName: string;
  email: string;
  phone: string | null;
  userReference: string | null;
  bio: string | null;
  education: string | null;
  educationDetail: string | null;
  experienceYears: number;
  gender: string;
  teachingMode: string | null;
  monthlySalaryMin: number | null;
  monthlySalaryMax: number | null;
  averageRating: number;
  totalReviews: number;
  totalStudents: number;
  verificationStatus: string;
  teachingPhilosophy: string | null;
  successStories: string | null;
  subjects: string[];
  classLevels: string[];
  districtName: string | null;
  presentAddress: string | null;
  educationEntries: { degree: string; institution: string; field_of_study: string | null; passing_year: number | null; result: string | null }[];
}

export async function generateTutorCV(userId: string): Promise<void> {
  // Fetch all needed data
  const [profileRes, tutorRes] = await Promise.all([
    supabase.from('profiles').select('full_name, email, phone, user_reference, district_id, districts(name_en)').eq('id', userId).single(),
    supabase.from('tutor_profiles').select('*').eq('user_id', userId).single(),
  ]);

  if (!profileRes.data || !tutorRes.data) throw new Error('Profile not found');

  const tutor = tutorRes.data;
  const profile = profileRes.data as any;

  // Fetch subjects
  const { data: subjectsData } = await supabase
    .from('tutor_subjects')
    .select('subjects(name_en)')
    .eq('tutor_profile_id', tutor.id);

  const subjects = subjectsData?.map((s: any) => s.subjects?.name_en).filter(Boolean) || [];

  const data: TutorCVData = {
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    userReference: profile.user_reference,
    bio: tutor.bio,
    education: tutor.education,
    educationDetail: tutor.education_detail,
    experienceYears: tutor.experience_years || 0,
    gender: tutor.gender,
    teachingMode: tutor.teaching_mode,
    monthlySalaryMin: tutor.monthly_salary_min,
    monthlySalaryMax: tutor.monthly_salary_max,
    averageRating: tutor.average_rating || 0,
    totalReviews: tutor.total_reviews || 0,
    totalStudents: tutor.total_students || 0,
    verificationStatus: tutor.verification_status || 'pending',
    teachingPhilosophy: tutor.teaching_philosophy,
    successStories: tutor.success_stories,
    subjects,
    classLevels: tutor.class_levels || [],
    districtName: profile.districts?.name_en || null,
    presentAddress: tutor.present_address,
  };

  openCVPrintWindow(data);
}

function openCVPrintWindow(data: TutorCVData) {
  const win = window.open('', '_blank');
  if (!win) return;

  const teachingModeLabel = data.teachingMode === 'in_person' ? 'In-Person' : data.teachingMode === 'online' ? 'Online' : data.teachingMode === 'hybrid' ? 'Hybrid' : 'N/A';
  const verifiedBadge = data.verificationStatus === 'approved' ? '✅ Verified' : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${data.fullName} - Tutor CV</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 3px solid #0f3460; padding-bottom: 20px; margin-bottom: 24px; }
  .header h1 { font-size: 28px; color: #0f3460; margin-bottom: 4px; }
  .header .ref { font-size: 13px; color: #666; font-family: monospace; }
  .header .subtitle { font-size: 14px; color: #555; margin-top: 8px; }
  .contact-row { display: flex; justify-content: center; gap: 24px; font-size: 13px; color: #444; margin-top: 8px; flex-wrap: wrap; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 16px; color: #0f3460; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1.5px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 10px; }
  .section p, .section li { font-size: 14px; }
  .section ul { padding-left: 20px; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
  .badge { background: #e8f4f8; color: #0f3460; padding: 3px 10px; border-radius: 12px; font-size: 12px; border: 1px solid #c8dce4; }
  .stats { display: flex; gap: 32px; margin-top: 8px; }
  .stat { text-align: center; }
  .stat .val { font-size: 22px; font-weight: bold; color: #0f3460; }
  .stat .lbl { font-size: 11px; color: #777; text-transform: uppercase; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
  .print-btn { display: block; margin: 0 auto 24px; padding: 10px 32px; background: #0f3460; color: #fff; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; }
  .print-btn:hover { background: #16213e; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">📄 Download / Print CV</button>
<div class="header">
  <h1>${data.fullName} ${verifiedBadge}</h1>
  ${data.userReference ? `<div class="ref">ID: ${data.userReference}</div>` : ''}
  <div class="subtitle">Private Tutor${data.districtName ? ` • ${data.districtName}` : ''}${data.gender ? ` • ${data.gender.charAt(0).toUpperCase() + data.gender.slice(1)}` : ''}</div>
  <div class="contact-row">
    <span>📧 ${data.email}</span>
    ${data.phone ? `<span>📱 ${data.phone}</span>` : ''}
    <span>🎓 ${teachingModeLabel}</span>
    ${data.monthlySalaryMin || data.monthlySalaryMax ? `<span>💰 ৳${data.monthlySalaryMin || '—'}–${data.monthlySalaryMax || '—'}/mo</span>` : ''}
  </div>
</div>

<div class="section">
  <div class="stats">
    <div class="stat"><div class="val">⭐ ${data.averageRating}</div><div class="lbl">Rating (${data.totalReviews} reviews)</div></div>
    <div class="stat"><div class="val">${data.experienceYears}</div><div class="lbl">Years Experience</div></div>
    <div class="stat"><div class="val">${data.totalStudents}</div><div class="lbl">Students Taught</div></div>
  </div>
</div>

${data.bio ? `<div class="section"><h2>About Me</h2><p>${data.bio}</p></div>` : ''}

${data.subjects.length > 0 ? `<div class="section"><h2>Subjects</h2><div class="badges">${data.subjects.map(s => `<span class="badge">${s}</span>`).join('')}</div></div>` : ''}

${data.classLevels.length > 0 ? `<div class="section"><h2>Class Levels</h2><div class="badges">${data.classLevels.map(c => `<span class="badge">${c}</span>`).join('')}</div></div>` : ''}

<div class="two-col">
  ${data.education ? `<div class="section"><h2>Education</h2><p>${data.education}</p>${data.educationDetail ? `<p style="margin-top:4px;color:#555;font-size:13px">${data.educationDetail}</p>` : ''}</div>` : ''}
  ${data.presentAddress ? `<div class="section"><h2>Address</h2><p>${data.presentAddress}</p></div>` : ''}
</div>


<div class="footer">Generated from Manage Tutor • managetutor.lovable.app</div>
</body></html>`;

  win.document.write(html);
  win.document.close();
}
