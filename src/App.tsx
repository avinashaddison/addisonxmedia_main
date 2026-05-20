import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager: landing + auth (entry surfaces, small, frequently first-paint).
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";

// Lazy: everything inside /app and the auxiliary pages. Each becomes its own
// chunk so first paint doesn't ship the entire app.
const Index = lazy(() => import("./pages/Index.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Admin panel — only loads if user has is_staff = true
const AdminShell = lazy(() => import("./components/admin/AdminShell").then((m) => ({ default: m.AdminShell })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminWorkspaces = lazy(() => import("./pages/admin/AdminWorkspaces.tsx"));
const AdminWorkspaceDetail = lazy(() => import("./pages/admin/AdminWorkspaceDetail.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions.tsx"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit.tsx"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff.tsx"));
const AdminHealth = lazy(() => import("./pages/admin/AdminHealth.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity.tsx"));

// Sensible global defaults — was using vanilla `new QueryClient()` which means
// staleTime: 0 (refetch on every mount) + refetchOnWindowFocus: true (refetch
// every tab focus). Both wreck perceived perf on the India→us-east-1 round trip.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached responses are considered fresh for 30s — mounting a component
      // that already has cached data shows it instantly without hitting the API.
      staleTime: 30_000,
      // Keep cache around for 5 min after last unmount.
      gcTime: 5 * 60_000,
      // Don't refetch when tab regains focus (default true). For an idle CRM
      // session this hammers the DB for nothing.
      refetchOnWindowFocus: false,
      // Don't refetch when network reconnects unless data is actually stale.
      refetchOnReconnect: "always",
      // One retry on failure (default 3 means user waits ~12s on a dead query).
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} storageKey="addisonx-theme">
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />

              {/* ── Admin panel (gated by is_staff in server middleware) ── */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="workspaces" element={<AdminWorkspaces />} />
                <Route path="workspaces/:id" element={<AdminWorkspaceDetail />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="staff" element={<AdminStaff />} />
                <Route path="health" element={<AdminHealth />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="security" element={<AdminSecurity />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
