import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HelpCircle, Send, Clock, CheckCircle2, AlertCircle, LifeBuoy } from 'lucide-react';
import { format } from 'date-fns';

const parentFaqs = [
  { q: 'How do I post a tuition job?', a: 'Click "Post a Job (Free)" from your dashboard. Fill in the subject, class, location, budget, and preferences. Your job will be reviewed and approved by our admin team within 24 hours.' },
  { q: 'How do I find the right tutor?', a: 'Browse tutors from the search page or wait for tutors to apply to your job. You can shortlist, invite for a demo class, and then hire the best fit.' },
  { q: 'What happens after I hire a tutor?', a: 'Once you confirm hiring, both you and the tutor receive a confirmation. The tutor\'s contact info is shared, and the agreed salary triggers commission tracking.' },
  { q: 'How does the demo class work?', a: 'After shortlisting a tutor, you can invite them for a demo class. Admin will approve the demo, and the tutor will confirm. After the demo, you decide whether to hire.' },
  { q: 'Can I get a refund for a demo class?', a: 'Yes! If the tutor doesn\'t show up or the demo was unsatisfactory, submit a refund request from the Help section. Admin will review and process within 3-5 business days.' },
  { q: 'What if I have a dispute with a tutor?', a: 'Submit a support ticket below with the category "Dispute". Our admin team will mediate and resolve the issue. This is the only structured communication channel on the platform.' },
  { q: 'How do I report a tutor for bad behavior?', a: 'Use the "Report" option on the tutor\'s profile or submit a support ticket with category "Tutor No-Show" or "Dispute". Admin will investigate and take action.' },
  { q: 'Is posting a job really free?', a: 'Yes! During our promotional period, posting tuition jobs is completely free. You only pay when you hire a tutor (platform commission applies).' },
];

const categories = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'dispute', label: 'Dispute with Tutor' },
  { value: 'refund', label: 'Refund Request' },
  { value: 'tutor_no_show', label: 'Tutor No-Show' },
  { value: 'hiring', label: 'Hiring Issue' },
  { value: 'technical', label: 'Technical Problem' },
  { value: 'other', label: 'Other' },
];

export function ParentHelpSupport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('faq');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (user) fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTickets(data || []);
    setLoadingTickets(false);
  };

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
      fetchTickets();
      setTab('tickets');
    }
    setSubmitting(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge className="bg-warning text-warning-foreground">Open</Badge>;
      case 'in_progress': return <Badge className="bg-primary">In Progress</Badge>;
      case 'resolved': return <Badge className="bg-success">Resolved</Badge>;
      case 'closed': return <Badge variant="outline">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5" />
            Help & Support
          </CardTitle>
          <CardDescription>FAQs, hiring guides, and direct admin support through tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="submit">Submit Ticket</TabsTrigger>
              <TabsTrigger value="tickets">My Tickets {tickets.length > 0 && `(${tickets.length})`}</TabsTrigger>
            </TabsList>

            <TabsContent value="faq">
              <Accordion type="single" collapsible className="w-full">
                {parentFaqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            <TabsContent value="submit">
              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject *</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of your issue" />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your issue in detail. Include job reference numbers, tutor names, and dates if applicable." rows={5} />
                </div>
                <Button onClick={submitTicket} disabled={submitting || !subject || !description}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="tickets">
              {loadingTickets ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading tickets...</p>
              ) : tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map((ticket: any) => (
                    <div key={ticket.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</span>
                            {statusBadge(ticket.status)}
                            <Badge variant="outline" className="text-xs capitalize">{ticket.category?.replace('_', ' ')}</Badge>
                          </div>
                          <h4 className="font-semibold text-sm mt-1">{ticket.subject}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(ticket.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No tickets submitted yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
