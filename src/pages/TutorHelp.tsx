import { useState } from 'react';
import { TutorSidebarLayout } from '@/components/TutorSidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HelpCircle, MessageSquare, Send, Mail, Phone } from 'lucide-react';

const faqs = [
  { q: 'How do I get more students?', a: 'Complete your profile to 100%, get verified, boost your profile, and apply to matching jobs regularly. Tutors with photos and complete profiles get 3-4x more views.' },
  { q: 'How does the verification badge work?', a: 'Pay the verification fee from your dashboard, upload your NID/documents, and our admin team will review. Once approved, you get a blue verified badge visible to all parents.' },
  { q: 'How do I withdraw my earnings?', a: 'Go to Settings → Payout Requests. You can request a payout via bKash, Nagad, or bank transfer. Admin will process it within 3-5 business days.' },
  { q: 'What happens when a parent accepts my application?', a: 'You\'ll receive a notification. The parent\'s contact details will be shared so you can coordinate the first class. A demo class may be scheduled first.' },
  { q: 'Can I teach online?', a: 'Yes! When applying to jobs, you can propose online classes. Many parents prefer online tuition, especially outside Dhaka.' },
  { q: 'How do I boost my profile?', a: 'Go to "Boost Your Profile" from the sidebar. Choose a boost plan (7, 14, or 30 days). Boosted profiles appear at the top of search results.' },
  { q: 'What if I have a dispute with a parent?', a: 'Submit a support ticket below with the category "Dispute". Our admin team will mediate and resolve the issue.' },
  { q: 'How is my monthly earning calculated?', a: 'Earnings are based on the proposed rate from accepted applications. Actual earnings may vary based on your agreement with parents.' },
];

export default function TutorHelp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitTicket = async () => {
    if (!user || !subject || !description) return;
    setSubmitting(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject,
      category,
      description,
      priority: 'medium',
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ticket Submitted', description: 'Our team will respond within 24-48 hours.' });
      setSubject('');
      setDescription('');
      setCategory('general');
    }
    setSubmitting(false);
  };

  return (
    <TutorSidebarLayout title="Help & Support">
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Submit Ticket */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-primary" /> Submit a Support Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Inquiry</SelectItem>
                <SelectItem value="payment">Payment Issue</SelectItem>
                <SelectItem value="technical">Technical Problem</SelectItem>
                <SelectItem value="dispute">Dispute</SelectItem>
                <SelectItem value="account">Account Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Subject *" value={subject} onChange={e => setSubject(e.target.value)} />
            <Textarea placeholder="Describe your issue in detail *" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
            <Button onClick={submitTicket} disabled={submitting || !subject || !description} className="w-full">
              <Send className="h-4 w-4 mr-2" /> Submit Ticket
            </Button>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-semibold mb-2">Other ways to reach us</p>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@managetutor.com</span>
              <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> +880 1XXX-XXXXXX</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </TutorSidebarLayout>
  );
}
