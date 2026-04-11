import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3"><Logo size="md" /></Link>
          <Link to="/auth" className="text-sm font-medium text-primary hover:underline">Login</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: April 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/80">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide when creating an account, including your name, email address, phone number, location, and profile details. For tutors, we additionally collect educational qualifications, teaching experience, and verification documents.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To create and manage your account on the platform</li>
              <li>To connect parents with suitable tutors based on preferences</li>
              <li>To verify tutor credentials and ensure platform safety</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send important notifications about your account and bookings</li>
              <li>To improve our services and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Data Sharing</h2>
            <p>We do not sell your personal data to third parties. We may share limited information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Other users as needed to facilitate tutor-parent connections</li>
              <li>Payment processors to handle transactions securely</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
            <p>We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your personal information from unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Cookies</h2>
            <p>We use essential cookies to maintain your session and preferences. We do not use third-party tracking cookies without your consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
            <p>You have the right to access, update, or delete your personal information at any time through your account settings. You may also request a copy of your data or ask us to stop processing it by contacting us at <a href="mailto:care@managetutor.com" className="text-primary hover:underline">care@managetutor.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Children's Privacy</h2>
            <p>Our platform is intended for use by parents/guardians and tutors. We do not knowingly collect personal information from children under 13 without parental consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes via email or platform notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
            <p>For any privacy-related questions, contact us at:</p>
            <p className="font-medium">Email: <a href="mailto:care@managetutor.com" className="text-primary hover:underline">care@managetutor.com</a></p>
            <p className="font-medium">Phone: 09647-874034</p>
            <p className="font-medium">Address: Katasur, Mohammadpur, Dhaka-1207, Bangladesh</p>
          </section>
        </div>
      </div>

      <footer className="bg-foreground text-background py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-background/40 text-sm">
          © {new Date().getFullYear()} Manage Tutor. All rights reserved. |{' '}
          <Link to="/terms" className="hover:text-background transition-colors">Terms & Conditions</Link> |{' '}
          <Link to="/contact" className="hover:text-background transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
