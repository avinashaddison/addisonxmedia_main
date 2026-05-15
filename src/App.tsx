import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="addisonx-theme">
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
