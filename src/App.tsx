import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import FindTutors from "./pages/FindTutors";
import BrowseJobs from "./pages/BrowseJobs";
import JobDetails from "./pages/JobDetails";
import AdminDashboard from "./pages/AdminDashboard";
import TutorProfile from "./pages/TutorProfile";
import TutorDashboard from "./pages/TutorDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import Messages from "./pages/Messages";
import WriteReview from "./pages/WriteReview";
import TutorPublicProfile from "./pages/TutorPublicProfile";
import LocationTutors from "./pages/LocationTutors";
import Favorites from "./pages/Favorites";
import Pricing from "./pages/Pricing";
import { PaymentSuccess, PaymentFailed, PaymentCancelled } from "./pages/PaymentResult";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tutors" element={<FindTutors />} />
              <Route path="/tutor/:id" element={<TutorPublicProfile />} />
              <Route path="/tutors/:location" element={<LocationTutors />} />
              <Route path="/jobs" element={<BrowseJobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/parent/dashboard" element={<ParentDashboard />} />
              <Route path="/tutor/dashboard" element={<TutorDashboard />} />
              <Route path="/tutor/profile" element={<TutorProfile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/review/:tutorId" element={<WriteReview />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failed" element={<PaymentFailed />} />
              <Route path="/payment/cancelled" element={<PaymentCancelled />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
