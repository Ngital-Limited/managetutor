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
import { ArrowLeft, Upload, Loader2, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BatchResult {
  imported: number;
  skipped: number;
  errors: number;
  details: { ref: string; status: string; reason?: string }[];
}

const BATCH_SIZE = 50;

const RECOGNIZED = new Set([
  'title', 'number_of_student', 'class', 'subject', 'catagory', 'category',
  'tution_type', 'country', 'division', 'city', 'address', 'tution_days',
  'tution_time', 'Salary', 'salary', 'Student Gender', 'student_gender',
  'Teacher Gender Requirement', 'teacher_gender', 'Gurdian Number', 'guardian_number',
  'status', 'created_at',
]);

export default function AdminBulkImportJobs() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [rows, setRows] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totals, setTotals] = useState({ imported: 0, skipped: 0, errors: 0 });
  const [log, setLog] = useState<{ ref: string; status: string; reason?: string }[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

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
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setHeaders((res.meta.fields || []) as string[]);
        setRows(res.data as any[]);
        setLog([]);
        setTotals({ imported: 0, skipped: 0, errors: 0 });
        setProgress(0);
        toast({ title: 'CSV loaded', description: `${res.data.length} rows` });
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
        const { data, error } = await supabase.functions.invoke<BatchResult>('bulk-import-jobs', {
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
        newLog.push(...batch.map((r: any) => ({ ref: r.title || '(unknown)', status: 'error', reason: e.message })));
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
    a.href = url; a.download = 'job_import_log.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const fields = [
      'title', 'number_of_student', 'class', 'subject', 'catagory',
      'tution_type', 'country', 'division', 'city', 'address',
      'tution_days', 'tution_time', 'Salary',
      'Student Gender', 'Teacher Gender Requirement', 'Gurdian Number', 'status',
    ];
    const sample = [
      'Need A Home Tutor For SSC', '1', '10', 'Physics, Chemistry & Biology', 'Bangla Medium',
      'Home Tuition', 'Bangladesh', 'Dhaka', 'Mohammadpur', 'Salimullah Road',
      '5', 'Evening', '5000',
      'male', 'male', '8801755695499', 'approved',
    ];
    const csv = Papa.unparse({ fields, data: [sample] });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'job_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 max-w-[1200px]">
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Admin
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Jobs</CardTitle>
          <CardDescription>
            Imports tuition jobs in batches of {BATCH_SIZE}. Each row's Gurdian Number will be matched
            to an existing parent or a new parent profile will be created automatically.
            Status: <code>approved</code> → open; everything else → pending_approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="csv">CSV File</Label>
              <Button type="button" size="sm" variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1" /> Download Template
              </Button>
            </div>
            <Input id="csv" type="file" accept=".csv" onChange={handleFile} disabled={running} />
            {rows.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{rows.length} rows loaded</p>
            )}
          </div>

          {headers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Detected Columns</h3>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {headers.map((h) => (
                    <Badge
                      key={h}
                      variant={RECOGNIZED.has(h) ? 'default' : 'outline'}
                      className="text-[10px] font-mono"
                    >
                      {h}
                    </Badge>
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
                    <span className="font-mono truncate">{entry.ref}</span>
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
