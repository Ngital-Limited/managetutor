import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MapPin, Phone, Mail, Send, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Contact() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim() || null;
    const subject = (formData.get('subject') as string)?.trim();
    const message = (formData.get('message') as string)?.trim();

    if (!name || !email || !subject || !message) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('contact_messages').insert({
      name, email, phone, subject, message
    });

    setLoading(false);
    if (error) {
      toast({ title: 'Failed to send message', description: 'Please try again later.', variant: 'destructive' });
    } else {
      toast({ title: 'Message sent!', description: "We'll get back to you within 24 hours." });
      form.reset();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="gradient-hero text-white py-16">
        <div className="max-w-[1200px] mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out and we'll respond within 24 hours.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-5 gap-10">
          {/* Contact Info */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Office Address</h3>
                  <p className="text-muted-foreground text-sm">Katasur, Mohammadpur, Dhaka-1207, Bangladesh</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Email</h3>
                  <a href="mailto:care@managetutor.com" className="text-muted-foreground text-sm hover:text-primary transition-colors">care@managetutor.com</a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Hotline</h3>
                  <a href="tel:09647874034" className="text-muted-foreground text-sm hover:text-primary transition-colors">09647-874034</a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">WhatsApp</h3>
                  <a href="https://wa.me/8801737874034" target="_blank" rel="noopener noreferrer" className="text-muted-foreground text-sm hover:text-primary transition-colors">01737-874034</a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Business Hours</h3>
                  <p className="text-muted-foreground text-sm">Sat–Thu: 9:00 AM – 9:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-3">
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
              <h2 className="text-2xl font-bold mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" placeholder="Your name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="your@email.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" placeholder="+880..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" placeholder="How can we help?" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" placeholder="Write your message here..." rows={5} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : <>Send Message <Send className="h-4 w-4 ml-2" /></>}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-center mb-10">Find quick answers to common questions about ManageTutor.</p>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="item-1" className="bg-card rounded-xl border border-border px-6">
              <AccordionTrigger className="hover:no-underline">How do I find a tutor?</AccordionTrigger>
              <AccordionContent>
                You can browse tutors on our "Find Tutors" page. Filter by subject, location, class level, and teaching mode to find the perfect match. You can also post a job and let tutors apply to you.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-card rounded-xl border border-border px-6">
              <AccordionTrigger className="hover:no-underline">Is ManageTutor free for parents?</AccordionTrigger>
              <AccordionContent>
                Yes! Parents can create an account, browse tutors, post jobs, and communicate with tutors completely free of charge. We only charge a small commission on confirmed bookings.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-card rounded-xl border border-border px-6">
              <AccordionTrigger className="hover:no-underline">How do I register as a tutor?</AccordionTrigger>
              <AccordionContent>
                Click "Join as Tutor" on the homepage, fill in your profile details including subjects, experience, and qualifications. Once submitted, our team will review and verify your profile within 24–48 hours.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-card rounded-xl border border-border px-6">
              <AccordionTrigger className="hover:no-underline">Are tutors verified?</AccordionTrigger>
              <AccordionContent>
                Yes, all tutors go through a verification process where we review their identity documents, educational qualifications, and experience. Verified tutors display a badge on their profile.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-card rounded-xl border border-border px-6">
              <AccordionTrigger className="hover:no-underline">Can I book a demo class before committing?</AccordionTrigger>
              <AccordionContent>
                Absolutely! You can book a demo class with any tutor to see if they're the right fit. Demo classes are a great way to evaluate a tutor's teaching style before making a long-term commitment.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-card rounded-xl border border-border px-6">
              <AccordionTrigger className="hover:no-underline">What payment methods do you accept?</AccordionTrigger>
              <AccordionContent>
                We accept payments via bKash, Nagad, bank transfer, and major debit/credit cards through our secure SSLCommerz payment gateway. All transactions are encrypted and secure.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-card rounded-xl border border-border px-6">
              <AccordionTrigger className="hover:no-underline">How do I contact support?</AccordionTrigger>
              <AccordionContent>
                You can reach us via email at care@managetutor.com, call our hotline at 09647-874034, or message us on WhatsApp at 01737-874034. Our support team is available Saturday to Thursday, 9 AM – 9 PM.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
