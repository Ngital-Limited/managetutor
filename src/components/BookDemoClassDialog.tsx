import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, BookOpen, Phone } from 'lucide-react';

const COMMISSION_RATE = 0.15; // 15% platform commission

interface Subject {
  id: string;
  name_en: string;
  name_bn: string;
}

interface BookDemoClassDialogProps {
  tutorId: string;
  tutorName: string;
  hourlyRateMin: number;
  hourlyRateMax: number;
  subjects: Subject[];
  onBooked?: () => void;
}

export default function BookDemoClassDialog({
  tutorId,
  tutorName,
  hourlyRateMin,
  hourlyRateMax,
  subjects,
  onBooked,
}: BookDemoClassDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [subjectId, setSubjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const durationMinutes = parseInt(duration);
  const avgRate = Math.round((hourlyRateMin + hourlyRateMax) / 2);
  const classFee = Math.round(avgRate * (durationMinutes / 60));
  const commission = Math.round(classFee * COMMISSION_RATE);
  const tutorPayout = classFee - commission;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!preferredDate || !preferredTime) {
      toast({ title: 'Missing fields', description: 'Please select date and time', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('demo_bookings').insert({
        parent_id: user.id,
        tutor_id: tutorId,
        subject_id: subjectId || null,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        duration_minutes: durationMinutes,
        class_fee: classFee,
        platform_commission: commission,
        tutor_payout: tutorPayout,
        notes: notes || null,
        parent_phone: parentPhone || null,
        status: 'pending',
      });

      if (error) throw error;

      toast({ title: 'Demo Class Requested!', description: 'Your request has been submitted for admin approval. You will be notified once approved.' });
      setOpen(false);
      resetForm();
      onBooked?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPreferredDate('');
    setPreferredTime('');
    setDuration('60');
    setSubjectId('');
    setNotes('');
    setParentPhone('');
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="secondary" size="lg">
          <Calendar className="h-4 w-4 mr-2" />
          Book Demo Class
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Book a Demo Class
          </DialogTitle>
          <DialogDescription>
            Try a trial lesson with {tutorName} before committing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {subjects.length > 0 && (
            <div>
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preferred Date *</Label>
              <Input
                type="date"
                value={preferredDate}
                onChange={e => setPreferredDate(e.target.value)}
                min={minDate}
                required
              />
            </div>
            <div>
              <Label>Preferred Time *</Label>
              <Input
                type="time"
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Your Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="01XXXXXXXXX"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
                className="pl-10"
                maxLength={15}
              />
            </div>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any specific topics or requirements..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Fee Breakdown */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Class Fee ({durationMinutes} min)</span>
              <span className="font-medium">৳{classFee}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Platform fee (15%)</span>
              <span>৳{commission}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">৳{classFee}</span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Booking...' : `Book Demo Class — ৳${classFee}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
