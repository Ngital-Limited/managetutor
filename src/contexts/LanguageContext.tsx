import React, { createContext, useContext, ReactNode } from 'react';

interface LanguageContextType {
  language: 'en';
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const translations: Record<string, string> = {
  'nav.home': 'Home',
  'nav.findTutors': 'Find Tutors',
  'nav.browseJobs': 'Browse Jobs',
  'nav.about': 'About Us',
  'nav.contact': 'Contact',
  'nav.login': 'Login',
  'nav.signup': 'Sign Up',
  'nav.dashboard': 'Dashboard',
  'nav.logout': 'Logout',
  'hero.title': 'Find Trusted Home Tutors in Bangladesh',
  'hero.subtitle': 'Connect with over 100,000 verified tutors for personalized education at home',
  'hero.cta.findTutor': 'Find a Tutor',
  'hero.cta.becomeTutor': 'Become a Tutor',
  'stats.tutors': 'Verified Tutors',
  'stats.matches': 'Successful Matches',
  'stats.cities': 'Cities Covered',
  'stats.satisfaction': 'Satisfaction Rate',
  'howItWorks.title': 'How It Works',
  'howItWorks.step1.title': 'Post Your Requirement',
  'howItWorks.step1.desc': 'Tell us about your learning needs, subjects, and preferences',
  'howItWorks.step2.title': 'Get Matched',
  'howItWorks.step2.desc': 'Browse verified tutors or receive applications from qualified teachers',
  'howItWorks.step3.title': 'Start Learning',
  'howItWorks.step3.desc': 'Connect with your tutor and begin your personalized learning journey',
  'auth.login': 'Login',
  'auth.signup': 'Sign Up',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.fullName': 'Full Name',
  'auth.forgotPassword': 'Forgot Password?',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  'auth.selectRole': 'I am a...',
  'auth.parent': 'Parent/Guardian',
  'auth.tutor': 'Tutor',
  
  'auth.continueWithGoogle': 'Continue with Google',
  'auth.continueWithFacebook': 'Continue with Facebook',
  'auth.or': 'or',
  'role.parent': 'Parent',
  'role.tutor': 'Tutor',
  
  'role.admin': 'Admin',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.apply': 'Apply',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.view': 'View',
  'common.loading': 'Loading...',
  'common.noResults': 'No results found',
  'common.perMonth': '/month',
  'common.perHour': '/hour',
  'footer.tagline': "Bangladesh's most trusted tutor marketplace",
  'footer.quickLinks': 'Quick Links',
  'footer.forTutors': 'For Tutors',
  'footer.support': 'Support',
  'footer.copyright': '© 2024 Manage Tutor. All rights reserved.',
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const t = (key: string): string => translations[key] || key;

  return (
    <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {}, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
