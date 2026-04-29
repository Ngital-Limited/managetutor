import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BatchResult {
  imported: number;
  skipped: number;
  errors: number;
  details: { email: string; status: string; reason?: string }[];
}

const BATCH_SIZE = 50;

// Aliases → canonical field name expected by the edge function.
// Keys are normalized (lowercase, no spaces/underscores/dashes/punctuation).
const HEADER_ALIASES: Record<string, string> = {
  firstname: 'fname', fname: 'fname', givenname: 'fname',
  lastname: 'lname', lname: 'lname', surname: 'lname', familyname: 'lname',
  fullname: 'fname', name: 'fname', username: 'fname',
  email: 'email', emailaddress: 'email', mail: 'email',
  phone: 'phone', mobile: 'phone', mobilenumber: 'phone', phonenumber: 'phone', contact: 'phone', primaryphone: 'phone',
  altphone: 'alt_phone', alternatephone: 'alt_phone', alternativephone: 'alt_phone', alternativeno: 'alt_phone', alternateno: 'alt_phone', altno: 'alt_phone', secondaryphone: 'alt_phone', emergencyphone: 'alt_phone', emergencycontact: 'alt_phone', emergecnycontact: 'alt_phone',
  fphone: 'f_phone', fatherphone: 'f_phone', fathersphone: 'f_phone', fathercontact: 'f_phone', fathernumber: 'f_phone', fathersnumber: 'f_phone', fatherno: 'f_phone',
  mphone: 'm_phone', motherphone: 'm_phone', mothersphone: 'm_phone', mothercontact: 'm_phone', mothersohone: 'm_phone', mothernumber: 'm_phone', mothersnumber: 'm_phone', motherno: 'm_phone',
  paddress: 'p_address', presentaddress: 'p_address', currentaddress: 'p_address', address: 'p_address',
  peraddress: 'per_address', permanentaddress: 'per_address', parmanentaddress: 'per_address', homeaddress: 'per_address',
  gender: 'gender', sex: 'gender',
  school: 'school', schoolname: 'school', ssc: 'school',
  college: 'college', collegename: 'college', hsc: 'college',
  university: 'university', universityname: 'university', univeristyname: 'university', institution: 'university',
  department: 'department', universitydepartment: 'department', major: 'department', fieldofstudy: 'department',
  presubject2: 'pre_subject', categories: 'pre_subject', category: 'pre_subject', subject: 'pre_subject',
  texperience: 't_experience', experience: 't_experience', tuitionexperience: 't_experience', teachingexperience: 't_experience', yearsofexperience: 't_experience',
  background: 'background', educationbackground: 'background', educationalbackground: 'background',
  medium: 'medium', languagemedium: 'medium', teachingmedium: 'medium',
  fblink: 'fb_link', facebook: 'fb_link', facebooklink: 'fb_link', facebookurl: 'fb_link', fburl: 'fb_link',
  preclass: 'pre_class', preferredclass: 'pre_class', preferredclasses: 'pre_class', classpreference: 'pre_class', classes: 'pre_class',
  presubject: 'pre_subject', preferredsubject: 'pre_subject', preferredsubjects: 'pre_subject', subjectpreference: 'pre_subject', subjects: 'pre_subject',
  prearea: 'pre_area', preferredarea: 'pre_area', preferredareas: 'pre_area', areapreference: 'pre_area', area: 'pre_area', location: 'pre_area', district: 'pre_area',
  status: 'status',
  photo: 'photo', photourl: 'photo', picture: 'photo', avatar: 'photo', avatarurl: 'photo', image: 'photo', imageurl: 'photo', profilepicture: 'photo', profilephoto: 'photo',
  nid: 'nid_url', nidcard: 'nid_url', nidurl: 'nid_url', nidcardurl: 'nid_url', nidcardattachmenturl: 'nid_url', nationalid: 'nid_url', nationalidcard: 'nid_url',
  studentid: 'student_id_url', universityid: 'student_id_url', universityidcard: 'student_id_url', universityidcardattachedurl: 'student_id_url', universityidurl: 'student_id_url', studentidcard: 'student_id_url',
};

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[\s_\-./()'’":,]+/g, '');
const mapHeader = (h: string) => HEADER_ALIASES[normalizeHeader(h)] || h;

export default function AdminBulkImportTutors() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [rows, setRows] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totals, setTotals] = useState({ imported: 0, skipped: 0, errors: 0 });
  const [log, setLog] = useState<{ email: string; status: string; reason?: string }[]>([]);
  const [mappingInfo, setMappingInfo] = useState<{ original: string; mapped: string; recognized: boolean }[]>([]);

  if (role !== 'admin') {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">Admin access required.</p>
        <Button variant="link" onClick={() => navigate('/admin')}>Back</Button>
      </div>
    );
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const originalHeaders: string[] = [];
    const canonical = new Set(Object.values(HEADER_ALIASES));
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => {
        const trimmed = h.trim();
        originalHeaders.push(trimmed);
        return mapHeader(trimmed);
      },
      complete: (res) => {
        const mappedHeaders = (res.meta.fields || []) as string[];
        setMappingInfo(originalHeaders.map((orig, i) => {
          const mapped = mappedHeaders[i] ?? orig;
          return { original: orig, mapped, recognized: canonical.has(mapped) };
        }));
        setRows(res.data as any[]);
        setLog([]);
        setTotals({ imported: 0, skipped: 0, errors: 0 });
        setProgress(0);
        const recognizedCount = mappedHeaders.filter(h => canonical.has(h)).length;
        toast({
          title: 'CSV loaded',
          description: `${res.data.length} rows · ${recognizedCount}/${mappedHeaders.length} columns auto-mapped`,
        });
      },
      error: (err) => toast({ title: 'Parse error', description: err.message, variant: 'destructive' }),
    });
  };

  const runImport = async () => {
    if (!rows.length) return;
    setRunning(true);
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    let imported = 0, skipped = 0, errors = 0;
    const newLog: typeof log = [];

    for (let i = 0; i < totalBatches; i++) {
      const batch = rows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      try {
        const { data, error } = await supabase.functions.invoke<BatchResult>('bulk-import-tutors', {
          body: { rows: batch },
        });
        if (error) throw error;
        if (data) {
          imported += data.imported;
          skipped += data.skipped;
          errors += data.errors;
          newLog.push(...data.details);
        }
      } catch (e: any) {
        errors += batch.length;
        newLog.push(...batch.map(r => ({ email: r.email, status: 'error', reason: e.message })));
      }
      setTotals({ imported, skipped, errors });
      setLog([...newLog]);
      setProgress(Math.round(((i + 1) / totalBatches) * 100));
    }

    setRunning(false);
    toast({ title: 'Import finished', description: `Imported ${imported} · Skipped ${skipped} · Errors ${errors}` });
  };

  const downloadLog = () => {
    const csv = Papa.unparse(log);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tutor_import_log.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Tutors</CardTitle>
          <CardDescription>
            Headers are auto-mapped (case-insensitive, ignores spaces, underscores, apostrophes, colons).
            Recognized fields: fname, lname, email, phone, gender, school, college, university,
            department, t_experience, background, medium, p_address, per_address, alt_phone, f_phone,
            m_phone, fb_link, pre_class, pre_subject, pre_area, status, photo, nid_url, student_id_url.
            Imports run in batches of {BATCH_SIZE}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csv">CSV File</Label>
            <Input id="csv" type="file" accept=".csv" onChange={handleFile} disabled={running} />
            {rows.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{rows.length} rows loaded</p>
            )}
          </div>

          {mappingInfo.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Column Mapping</h3>
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {mappingInfo.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-0.5">
                      <span className="font-mono truncate flex-1" title={m.original}>{m.original}</span>
                      <span className="text-muted-foreground">→</span>
                      {m.recognized ? (
                        <Badge variant="default" className="text-[10px] px-1 py-0 font-mono">{m.mapped}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">ignored</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button onClick={runImport} disabled={!rows.length || running} className="w-full">
            {running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4 mr-2" /> Start Import</>}
          </Button>

          {(running || progress > 0) && (
            <div className="space-y-2">
              <Progress value={progress} />
              <div className="flex gap-2 text-sm">
                <Badge variant="default">Imported: {totals.imported}</Badge>
                <Badge variant="secondary">Skipped: {totals.skipped}</Badge>
                <Badge variant="destructive">Errors: {totals.errors}</Badge>
                <span className="text-muted-foreground ml-auto">{progress}%</span>
              </div>
            </div>
          )}

          {log.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Log ({log.length})</h3>
                <Button size="sm" variant="outline" onClick={downloadLog}>Download CSV</Button>
              </div>
              <ScrollArea className="h-64 border rounded-md p-2">
                {log.slice(-200).reverse().map((entry, idx) => (
                  <div key={idx} className="text-xs py-0.5 flex gap-2">
                    <Badge variant={entry.status === 'imported' ? 'default' : entry.status === 'skipped' ? 'secondary' : 'destructive'} className="text-[10px] px-1 py-0">
                      {entry.status}
                    </Badge>
                    <span className="font-mono">{entry.email}</span>
                    {entry.reason && <span className="text-muted-foreground">— {entry.reason}</span>}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
