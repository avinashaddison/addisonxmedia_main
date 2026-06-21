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
const AdminDiagnostics = lazy(() => import("./pages/admin/AdminDiagnostics.tsx"));
const AdminMetaApi = lazy(() => import("./pages/admin/AdminMetaApi.tsx"));
const AdminAgentPlayground = lazy(() => import("./pages/admin/AdminAgentPlayground.tsx"));
const AdminMarketingAgent = lazy(() => import("./pages/admin/AdminMarketingAgent.tsx"));
const UpgradeReturn = lazy(() => import("./pages/UpgradeReturn.tsx"));

// Admin — Task #14 core module pages + scaffold shells
const AdminActiveClients = lazy(() => import("./pages/admin/AdminActiveClients.tsx"));
const AdminSuspendedClients = lazy(() => import("./pages/admin/AdminSuspendedClients.tsx"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans.tsx"));
const AdminRenewals = lazy(() => import("./pages/admin/AdminRenewals.tsx"));
const AdminPlatformCoupons = lazy(() => import("./pages/admin/AdminPlatformCoupons.tsx"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue.tsx"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions.tsx"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts.tsx"));
const AdminFinancialReports = lazy(() => import("./pages/admin/AdminFinancialReports.tsx"));
const AdminClientGrowth = lazy(() => import("./pages/admin/AdminClientGrowth.tsx"));
const AdminRevenueGrowth = lazy(() => import("./pages/admin/AdminRevenueGrowth.tsx"));
const AdminLoginLogs = lazy(() => import("./pages/admin/AdminLoginLogs.tsx"));
const AdminActivityLogs = lazy(() => import("./pages/admin/AdminActivityLogs.tsx"));
const AdminPermissions = lazy(() => import("./pages/admin/AdminPermissions.tsx"));
const AdminWhatsAppInstances = lazy(() => import("./pages/admin/WhatsAppInstances.tsx"));
const AdminWhatsAppNumbers = lazy(() => import("./pages/admin/WhatsAppNumbers.tsx"));
const AdminWhatsAppUsage = lazy(() => import("./pages/admin/WhatsAppUsage.tsx"));
const AdminSupportTickets = lazy(() => import("./pages/admin/SupportTickets.tsx"));
const AdminSupportLiveChat = lazy(() => import("./pages/admin/SupportLiveChat.tsx"));
const AdminSupportAnnouncements = lazy(() => import("./pages/admin/SupportAnnouncements.tsx"));
const AdminSupportKnowledgeBase = lazy(() => import("./pages/admin/SupportKnowledgeBase.tsx"));
const AdminApiKeys = lazy(() => import("./pages/admin/ApiKeys.tsx"));
const AdminBackups = lazy(() => import("./pages/admin/Backups.tsx"));

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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} themes={["light", "dark", "cool-dark"]} storageKey="addisonx-theme">
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
              {/* Cashfree return_url lands here. MUST be declared BEFORE
                  /app/* otherwise the catch-all eats the path. */}
              <Route
                path="/app/upgrade/return"
                element={
                  <ProtectedRoute>
                    <UpgradeReturn />
                  </ProtectedRoute>
                }
              />
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

                {/* Client Management */}
                <Route path="workspaces" element={<AdminWorkspaces />} />
                <Route path="workspaces/:id" element={<AdminWorkspaceDetail />} />
                <Route path="clients/active" element={<AdminActiveClients />} />
                <Route path="clients/suspended" element={<AdminSuspendedClients />} />
                <Route path="users" element={<AdminUsers />} />

                {/* Subscription Management */}
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="subscriptions/plans" element={<AdminPlans />} />
                <Route path="subscriptions/renewals" element={<AdminRenewals />} />
                <Route path="subscriptions/coupons" element={<AdminPlatformCoupons />} />

                {/* Finance */}
                <Route path="finance/revenue" element={<AdminRevenue />} />
                <Route path="finance/transactions" element={<AdminTransactions />} />
                <Route path="finance/payouts" element={<AdminPayouts />} />
                <Route path="finance/reports" element={<AdminFinancialReports />} />

                {/* WhatsApp Management */}
                <Route path="whatsapp/instances" element={<AdminWhatsAppInstances />} />
                <Route path="whatsapp/numbers" element={<AdminWhatsAppNumbers />} />
                <Route path="whatsapp/usage" element={<AdminWhatsAppUsage />} />
                <Route path="marketing-agent" element={<AdminMarketingAgent />} />

                {/* Support Center */}
                <Route path="support/tickets" element={<AdminSupportTickets />} />
                <Route path="support/live-chat" element={<AdminSupportLiveChat />} />
                <Route path="support/announcements" element={<AdminSupportAnnouncements />} />
                <Route path="support/knowledge-base" element={<AdminSupportKnowledgeBase />} />

                {/* Analytics */}
                <Route path="analytics/client-growth" element={<AdminClientGrowth />} />
                <Route path="analytics/revenue-growth" element={<AdminRevenueGrowth />} />
                <Route path="diagnostics" element={<AdminDiagnostics />} />
                <Route path="health" element={<AdminHealth />} />

                {/* System Management */}
                <Route path="staff" element={<AdminStaff />} />
                <Route path="system/permissions" element={<AdminPermissions />} />
                <Route path="meta-api" element={<AdminMetaApi />} />
                <Route path="system/api-keys" element={<AdminApiKeys />} />
                <Route path="system/backups" element={<AdminBackups />} />
                <Route path="settings" element={<AdminSettings />} />

                {/* Security */}
                <Route path="security/login-logs" element={<AdminLoginLogs />} />
                <Route path="security/activity-logs" element={<AdminActivityLogs />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="security" element={<AdminSecurity />} />

                {/* Kept reachable via direct URL (not in the new menu) */}
                <Route path="agent-playground" element={<AdminAgentPlayground />} />
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
