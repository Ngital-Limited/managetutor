import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-10">Last updated: April 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/80">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using Manage Tutor (managetutor.com), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete information during registration</li>
              <li>Each user may register as either a Parent or a Tutor — not both</li>
              <li>One phone number and one email address can only be associated with one account</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>Duplicate accounts are not allowed and will be suspended</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. User Roles</h2>
            <p><strong>Parents:</strong> Can post tuition jobs, browse tutor profiles, book demo classes, and write reviews.</p>
            <p><strong>Tutors:</strong> Can create profiles, apply for jobs, accept bookings, and manage their teaching schedule.</p>
            <p>Role conversion between Parent and Tutor is not permitted. You must create separate accounts if needed (with different credentials).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Tutor Verification</h2>
            <p>Tutors are encouraged to submit verification documents. Manage Tutor reviews these documents but does not guarantee the accuracy of all information. Parents are advised to exercise their own judgment when hiring a tutor.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Payment & Fees</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Platform fees and commission rates are displayed during transactions</li>
              <li>All payments are processed through our secure payment gateway</li>
              <li>Refunds are subject to our refund policy and will be reviewed case by case</li>
              <li>Subscription plans auto-renew unless cancelled before the renewal date</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Prohibited Conduct</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Providing false information in your profile or job posts</li>
              <li>Harassing, threatening, or abusing other users</li>
              <li>Attempting to circumvent platform payments or fees</li>
              <li>Sharing another user's personal information without consent</li>
              <li>Using the platform for any unlawful purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Content & Reviews</h2>
            <p>Users may post reviews and comments. Manage Tutor reserves the right to remove content that violates our guidelines. Reviews must be honest and based on genuine experiences.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or are reported by other users. Users may also delete their accounts at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <p>Manage Tutor acts as a platform connecting tutors and parents. We are not responsible for the quality of tutoring services, disputes between users, or any damages arising from the use of our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Governing Law</h2>
            <p>These terms are governed by the laws of the People's Republic of Bangladesh. Any disputes shall be resolved in the courts of Dhaka, Bangladesh.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
            <p>For questions about these terms, contact us at:</p>
            <p className="font-medium">Email: <a href="mailto:care@managetutor.com" className="text-primary hover:underline">care@managetutor.com</a></p>
            <p className="font-medium">Phone: 09647-874034</p>
            <p className="font-medium">Address: Katasur, Mohammadpur, Dhaka-1207, Bangladesh</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
