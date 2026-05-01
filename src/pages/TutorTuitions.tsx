import { useState, useEffect } from 'react';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Calendar, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface TuitionSession {
  id: string;
  student_name: string;
  subject: string;
  class_level: string;
  session_day: string;
  session_time: string;
  monthly_fee: number;
  status: string;
  notes: string;
  started_at: string;
  created_at: string;
}

interface SessionLog {
  id: string;
  session_id: string;
  log_date: string;
  attendance: string;
  topic_covered: string;
  homework_given: string;
  tutor_notes: string;
}

export default function TutorTuitions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<TuitionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionLogs, setSessionLogs] = useState<Record<string, SessionLog[]>>({});
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddLog, setShowAddLog] = useState<string | null>(null);
  const [tutorId, setTutorId] = useState<string | null>(null);

  const [newSession, setNewSession] = useState({
    student_name: '', subject: '', class_level: '', session_day: '', session_time: '', monthly_fee: 0, notes: ''
  });
  const [newLog, setNewLog] = useState({
    log_date: new Date().toISOString().split('T')[0], attendance: 'present', topic_covered: '', homework_given: '', tutor_notes: ''
  });

  useEffect(() => {
    if (user) fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    const { data: tp } = await supabase.from('tutor_profiles').select('id').eq('user_id', user.id).single();
    if (tp) setTutorId(tp.id);

    const { data } = await supabase
      .from('tuition_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSessions((data || []) as TuitionSession[]);
    setLoading(false);
  };

  const fetchLogs = async (sessionId: string) => {
    const { data } = await supabase
      .from('session_logs')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user!.id)
      .order('log_date', { ascending: false });
    setSessionLogs(prev => ({ ...prev, [sessionId]: (data || []) as SessionLog[] }));
  };

  const toggleExpand = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      if (!sessionLogs[sessionId]) fetchLogs(sessionId);
    }
  };

  const addSession = async () => {
    if (!user || !tutorId) return;
    const { error } = await supabase.from('tuition_sessions').insert({
      ...newSession,
      user_id: user.id,
      tutor_id: tutorId,
      status: 'active',
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Session Added' });
      setShowAddSession(false);
      setNewSession({ student_name: '', subject: '', class_level: '', session_day: '', session_time: '', monthly_fee: 0, notes: '' });
      fetchSessions();
    }
  };

  const addLog = async (sessionId: string) => {
    if (!user) return;
    const { error } = await supabase.from('session_logs').insert({
      ...newLog,
      session_id: sessionId,
      user_id: user.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Log Added' });
      setShowAddLog(null);
      setNewLog({ log_date: new Date().toISOString().split('T')[0], attendance: 'present', topic_covered: '', homework_given: '', tutor_notes: '' });
      fetchLogs(sessionId);
    }
  };

  const updateSessionStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('tuition_sessions').update({ status }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: `Session ${status}` }); fetchSessions(); }
  };

  const deleteLog = async (logId: string, sessionId: string) => {
    const { error } = await supabase.from('session_logs').delete().eq('id', logId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else fetchLogs(sessionId);
  };

  const statusColor = (s: string) => s === 'active' ? 'bg-green-500/10 text-green-700' : s === 'paused' ? 'bg-yellow-500/10 text-yellow-700' : 'bg-muted text-muted-foreground';
  const attendanceColor = (a: string) => a === 'present' ? 'text-green-600' : a === 'absent' ? 'text-red-600' : 'text-yellow-600';

  return (
    <TutorSidebarLayout title="My Tuitions">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Active Tuitions</h2>
            <p className="text-sm text-muted-foreground">Manage your ongoing tuitions, log classes, and track attendance.</p>
          </div>
          <Dialog open={showAddSession} onOpenChange={setShowAddSession}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Tuition</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Tuition</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Student Name *" value={newSession.student_name} onChange={e => setNewSession(p => ({ ...p, student_name: e.target.value }))} />
                <Input placeholder="Subject *" value={newSession.subject} onChange={e => setNewSession(p => ({ ...p, subject: e.target.value }))} />
                <Input placeholder="Class Level (e.g. Class 8)" value={newSession.class_level} onChange={e => setNewSession(p => ({ ...p, class_level: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Day (e.g. Sat, Mon)" value={newSession.session_day} onChange={e => setNewSession(p => ({ ...p, session_day: e.target.value }))} />
                  <Input placeholder="Time (e.g. 4:00 PM)" value={newSession.session_time} onChange={e => setNewSession(p => ({ ...p, session_time: e.target.value }))} />
                </div>
                <Input type="number" placeholder="Monthly Fee (৳)" value={newSession.monthly_fee || ''} onChange={e => setNewSession(p => ({ ...p, monthly_fee: parseInt(e.target.value) || 0 }))} />
                <Textarea placeholder="Notes (optional)" value={newSession.notes} onChange={e => setNewSession(p => ({ ...p, notes: e.target.value }))} />
                <Button onClick={addSession} disabled={!newSession.student_name || !newSession.subject} className="w-full">Add Tuition</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : sessions.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No tuitions yet</p>
            <p className="text-sm">Add your active tuitions to track classes and attendance.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <Card key={session.id} className="overflow-hidden">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleExpand(session.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {session.student_name}
                        <Badge variant="secondary" className={statusColor(session.status)}>{session.status}</Badge>
                      </CardTitle>
                      <CardDescription className="flex flex-wrap gap-3 mt-1 text-xs">
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{session.subject}</span>
                        {session.class_level && <span>{session.class_level}</span>}
                        {session.session_day && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{session.session_day}</span>}
                        {session.session_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{session.session_time}</span>}
                        {session.monthly_fee > 0 && <span className="font-semibold text-primary">৳{session.monthly_fee}/mo</span>}
                      </CardDescription>
                    </div>
                    {expandedSession === session.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>

                {expandedSession === session.id && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {session.status === 'active' && (
                        <Button variant="outline" size="sm" onClick={() => updateSessionStatus(session.id, 'paused')}>Pause</Button>
                      )}
                      {session.status === 'paused' && (
                        <Button variant="outline" size="sm" onClick={() => updateSessionStatus(session.id, 'active')}>Resume</Button>
                      )}
                      {session.status !== 'completed' && (
                        <Button variant="outline" size="sm" onClick={() => updateSessionStatus(session.id, 'completed')}>Mark Complete</Button>
                      )}
                      <Dialog open={showAddLog === session.id} onOpenChange={v => setShowAddLog(v ? session.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm"><Plus className="h-3 w-3 mr-1" /> Add Class Log</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Log a Class</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <Input type="date" value={newLog.log_date} onChange={e => setNewLog(p => ({ ...p, log_date: e.target.value }))} />
                            <Select value={newLog.attendance} onValueChange={v => setNewLog(p => ({ ...p, attendance: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input placeholder="Topic Covered" value={newLog.topic_covered} onChange={e => setNewLog(p => ({ ...p, topic_covered: e.target.value }))} />
                            <Input placeholder="Homework Given" value={newLog.homework_given} onChange={e => setNewLog(p => ({ ...p, homework_given: e.target.value }))} />
                            <Textarea placeholder="Notes" value={newLog.tutor_notes} onChange={e => setNewLog(p => ({ ...p, tutor_notes: e.target.value }))} />
                            <Button onClick={() => addLog(session.id)} className="w-full">Save Log</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Class Logs */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Class Logs ({sessionLogs[session.id]?.length || 0})</h4>
                      {!sessionLogs[session.id] || sessionLogs[session.id].length === 0 ? (
                        <p className="text-xs text-muted-foreground">No logs yet. Add your first class log above.</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {sessionLogs[session.id].map(log => (
                            <div key={log.id} className="flex items-start justify-between border rounded-md p-2 text-xs">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{log.log_date}</span>
                                  <span className={`font-semibold capitalize ${attendanceColor(log.attendance)}`}>{log.attendance}</span>
                                </div>
                                {log.topic_covered && <p><span className="text-muted-foreground">Topic:</span> {log.topic_covered}</p>}
                                {log.homework_given && <p><span className="text-muted-foreground">Homework:</span> {log.homework_given}</p>}
                                {log.tutor_notes && <p><span className="text-muted-foreground">Notes:</span> {log.tutor_notes}</p>}
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteLog(log.id, session.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </TutorSidebarLayout>
  );
}
