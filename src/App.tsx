import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages — reduces initial bundle size on mobile
const Index = React.lazy(() => import("./pages/Index"));
const Auth = React.lazy(() => import("./pages/Auth"));
const PatientDashboard = React.lazy(() => import("./pages/PatientDashboard"));
const PractitionerDashboard = React.lazy(() => import("./pages/PractitionerDashboard"));
const NewPractitionerDashboard = React.lazy(() => import("./pages/NewPractitionerDashboard"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/patient" element={
              <ProtectedRoute allowedRoles={['patient', 'admin']}>
                <PatientDashboard />
              </ProtectedRoute>
            } />
            <Route path="/practitioner" element={
              <ProtectedRoute allowedRoles={['practitioner', 'admin']}>
                <PractitionerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/practitioner-new" element={
              <ProtectedRoute allowedRoles={['practitioner', 'admin']}>
                <NewPractitionerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
