import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Users, Shield, Award, Heart, Target, BookOpen, GraduationCap, MapPin, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function About() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="gradient-hero text-white py-20">
        <div className="max-w-[1200px] mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About Manage Tutor</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Bangladesh's most trusted platform connecting students and parents with verified home tutors. We're on a mission to make quality education accessible to every family.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-4">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-10">
          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover-lift">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              To bridge the gap between quality tutors and eager learners across Bangladesh. We believe every student deserves access to personalized, one-on-one education that helps them reach their full potential — regardless of location.
            </p>
          </div>
          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover-lift">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
            <p className="text-muted-foreground leading-relaxed">
              To become Bangladesh's leading education platform where every parent can confidently find a verified, skilled tutor and every passionate educator can build a sustainable teaching career from home.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Our Impact in Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, value: '1,00,000+', label: 'Verified Tutors' },
              { icon: GraduationCap, value: '4,000+', label: 'Tuition Matches' },
              { icon: MapPin, value: '64', label: 'Districts Covered' },
              { icon: Award, value: '98%', label: 'Parent Satisfaction' },
            ].map((stat, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 text-center border border-border shadow-sm">
                <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Manage Tutor?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Verified Tutors', desc: 'Every tutor goes through a thorough verification process including ID checks and credential validation for your safety.' },
              { icon: Heart, title: 'Personalized Matching', desc: 'Our smart matching system connects you with tutors who fit your specific subject, location, and budget requirements.' },
              { icon: CheckCircle, title: 'Quality Guaranteed', desc: 'We monitor tutor performance through reviews and ratings to ensure consistently high-quality teaching experiences.' },
            ].map((item, i) => (
              <div key={i} className="text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 gradient-hero text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-white/70 mb-8">Join thousands of families who trust Manage Tutor for quality home education.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tutors" className="px-8 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors">
              Find a Tutor
            </Link>
            <Link to="/auth" className="px-8 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
              Register as Tutor
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
