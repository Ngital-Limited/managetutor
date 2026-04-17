import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import FindTutors from "./pages/FindTutors";
import BrowseJobs from "./pages/BrowseJobs";
import JobDetails from "./pages/JobDetails";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBulkImportTutors from "./pages/AdminBulkImportTutors";
import TutorProfile from "./pages/TutorProfile";
import TutorDashboard from "./pages/TutorDashboard";
import TutorAppliedJobs from "./pages/TutorAppliedJobs";
import TutorFindJobs from "./pages/TutorFindJobs";
import TutorRecommendations from "./pages/TutorRecommendations";
import TutorBoost from "./pages/TutorBoost";
import TutorVerifyBadge from "./pages/TutorVerifyBadge";
import ParentDashboard from "./pages/ParentDashboard";
import ParentProfileEdit from "./pages/ParentProfileEdit";

import TutorPublicProfile from "./pages/TutorPublicProfile";
import LocationTutors from "./pages/LocationTutors";
import Favorites from "./pages/Favorites";
import Pricing from "./pages/Pricing";
import { PaymentSuccess, PaymentFailed, PaymentCancelled } from "./pages/PaymentResult";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Install from "./pages/Install";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { InstallAppBanner } from "./components/InstallAppBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <ImpersonationBanner />
            <InstallAppBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tutors" element={<FindTutors />} />
              <Route path="/tutor/:id" element={<TutorPublicProfile />} />
              <Route path="/tutors/:location" element={<LocationTutors />} />
              <Route path="/jobs" element={<BrowseJobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/parent/dashboard" element={<ParentDashboard />} />
              <Route path="/parent/profile" element={<ParentProfileEdit />} />
              <Route path="/admin/parent/:userId" element={<ParentProfileEdit />} />
              <Route path="/tutor/dashboard" element={<TutorDashboard />} />
              <Route path="/tutor/applications" element={<TutorAppliedJobs />} />
              <Route path="/tutor/find-jobs" element={<TutorFindJobs />} />
              <Route path="/tutor/recommendations" element={<TutorRecommendations />} />
              <Route path="/tutor/boost" element={<TutorBoost />} />
              <Route path="/tutor/verify-badge" element={<TutorVerifyBadge />} />
              <Route path="/tutor/profile" element={<TutorProfile />} />
              <Route path="/admin/tutor/:userId" element={<TutorProfile />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failed" element={<PaymentFailed />} />
              <Route path="/payment/cancelled" element={<PaymentCancelled />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/import-tutors" element={<AdminBulkImportTutors />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/install" element={<Install />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
