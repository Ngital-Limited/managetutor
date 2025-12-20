import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.findTutors': 'Find Tutors',
    'nav.browseJobs': 'Browse Jobs',
    'nav.about': 'About Us',
    'nav.contact': 'Contact',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.dashboard': 'Dashboard',
    'nav.logout': 'Logout',

    // Hero Section
    'hero.title': 'Find Trusted Home Tutors in Bangladesh',
    'hero.subtitle': 'Connect with over 100,000 verified tutors for personalized education at home',
    'hero.cta.findTutor': 'Find a Tutor',
    'hero.cta.becomeTutor': 'Become a Tutor',

    // Stats
    'stats.tutors': 'Verified Tutors',
    'stats.matches': 'Successful Matches',
    'stats.cities': 'Cities Covered',
    'stats.satisfaction': 'Satisfaction Rate',

    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.step1.title': 'Post Your Requirement',
    'howItWorks.step1.desc': 'Tell us about your learning needs, subjects, and preferences',
    'howItWorks.step2.title': 'Get Matched',
    'howItWorks.step2.desc': 'Browse verified tutors or receive applications from qualified teachers',
    'howItWorks.step3.title': 'Start Learning',
    'howItWorks.step3.desc': 'Connect with your tutor and begin your personalized learning journey',

    // Auth
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
    'auth.agency': 'Agency/Institution',
    'auth.continueWithGoogle': 'Continue with Google',
    'auth.continueWithFacebook': 'Continue with Facebook',
    'auth.or': 'or',

    // Roles
    'role.parent': 'Parent',
    'role.tutor': 'Tutor',
    'role.agency': 'Agency',
    'role.admin': 'Admin',

    // Common
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

    // Footer
    'footer.tagline': 'Bangladesh\'s most trusted tutor marketplace',
    'footer.quickLinks': 'Quick Links',
    'footer.forTutors': 'For Tutors',
    'footer.support': 'Support',
    'footer.copyright': '© 2024 Manage Tutor. All rights reserved.',
  },
  bn: {
    // Navigation
    'nav.home': 'হোম',
    'nav.findTutors': 'টিউটর খুঁজুন',
    'nav.browseJobs': 'চাকরি ব্রাউজ করুন',
    'nav.about': 'আমাদের সম্পর্কে',
    'nav.contact': 'যোগাযোগ',
    'nav.login': 'লগইন',
    'nav.signup': 'সাইন আপ',
    'nav.dashboard': 'ড্যাশবোর্ড',
    'nav.logout': 'লগআউট',

    // Hero Section
    'hero.title': 'বাংলাদেশে বিশ্বস্ত হোম টিউটর খুঁজুন',
    'hero.subtitle': 'ব্যক্তিগত শিক্ষার জন্য ১,০০,০০০+ যাচাইকৃত টিউটরের সাথে সংযুক্ত হন',
    'hero.cta.findTutor': 'টিউটর খুঁজুন',
    'hero.cta.becomeTutor': 'টিউটর হন',

    // Stats
    'stats.tutors': 'যাচাইকৃত টিউটর',
    'stats.matches': 'সফল ম্যাচ',
    'stats.cities': 'শহর কভার',
    'stats.satisfaction': 'সন্তুষ্টির হার',

    // How It Works
    'howItWorks.title': 'কিভাবে কাজ করে',
    'howItWorks.step1.title': 'আপনার প্রয়োজনীয়তা পোস্ট করুন',
    'howItWorks.step1.desc': 'আপনার শেখার চাহিদা, বিষয় এবং পছন্দ সম্পর্কে বলুন',
    'howItWorks.step2.title': 'ম্যাচ পান',
    'howItWorks.step2.desc': 'যাচাইকৃত টিউটর ব্রাউজ করুন বা যোগ্য শিক্ষকদের কাছ থেকে আবেদন পান',
    'howItWorks.step3.title': 'শেখা শুরু করুন',
    'howItWorks.step3.desc': 'আপনার টিউটরের সাথে সংযুক্ত হন এবং ব্যক্তিগত শেখার যাত্রা শুরু করুন',

    // Auth
    'auth.login': 'লগইন',
    'auth.signup': 'সাইন আপ',
    'auth.email': 'ইমেইল',
    'auth.password': 'পাসওয়ার্ড',
    'auth.confirmPassword': 'পাসওয়ার্ড নিশ্চিত করুন',
    'auth.fullName': 'পুরো নাম',
    'auth.forgotPassword': 'পাসওয়ার্ড ভুলে গেছেন?',
    'auth.noAccount': 'অ্যাকাউন্ট নেই?',
    'auth.hasAccount': 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
    'auth.selectRole': 'আমি একজন...',
    'auth.parent': 'অভিভাবক',
    'auth.tutor': 'টিউটর',
    'auth.agency': 'এজেন্সি/প্রতিষ্ঠান',
    'auth.continueWithGoogle': 'গুগল দিয়ে চালিয়ে যান',
    'auth.continueWithFacebook': 'ফেসবুক দিয়ে চালিয়ে যান',
    'auth.or': 'অথবা',

    // Roles
    'role.parent': 'অভিভাবক',
    'role.tutor': 'টিউটর',
    'role.agency': 'এজেন্সি',
    'role.admin': 'অ্যাডমিন',

    // Common
    'common.search': 'অনুসন্ধান',
    'common.filter': 'ফিল্টার',
    'common.apply': 'আবেদন',
    'common.cancel': 'বাতিল',
    'common.save': 'সংরক্ষণ',
    'common.edit': 'সম্পাদনা',
    'common.delete': 'মুছুন',
    'common.view': 'দেখুন',
    'common.loading': 'লোড হচ্ছে...',
    'common.noResults': 'কোন ফলাফল পাওয়া যায়নি',
    'common.perMonth': '/মাস',
    'common.perHour': '/ঘন্টা',

    // Footer
    'footer.tagline': 'বাংলাদেশের সবচেয়ে বিশ্বস্ত টিউটর মার্কেটপ্লেস',
    'footer.quickLinks': 'দ্রুত লিঙ্ক',
    'footer.forTutors': 'টিউটরদের জন্য',
    'footer.support': 'সহায়তা',
    'footer.copyright': '© ২০২৪ ম্যানেজ টিউটর। সর্বস্বত্ব সংরক্ষিত।',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'bn')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
