import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";

// Eager: landing/main app (critical path)
import Index from "./pages/Index.tsx";

// Lazy: secondary pages
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));
const BlogIndex = lazy(() => import("./pages/BlogIndex.tsx"));
const BlogArticle = lazy(() => import("./pages/BlogArticle.tsx"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage.tsx"));
const TermsPage = lazy(() => import("./pages/TermsPage.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const SuspendedPage = lazy(() => import("./pages/SuspendedPage.tsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage.tsx"));
const PastorDashboard = lazy(() => import("./pages/PastorDashboard.tsx"));
const PastorSetup = lazy(() => import("./pages/PastorSetup.tsx"));
const JoinCommunity = lazy(() => import("./pages/JoinCommunity.tsx"));
const SharedDraftView = lazy(() => import("./pages/SharedDraftView.tsx"));
const DoctrinePage = lazy(() => import("./pages/DoctrinePage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Dev-only visual regression fixtures (tree-shaken in production builds).
const VisualAskFixture = import.meta.env.DEV
  ? lazy(() =>
      import("./pages/__visual/VisualFixtures.tsx").then((m) => ({
        default: m.VisualAskFixture,
      })),
    )
  : null;
const VisualResponseFixture = import.meta.env.DEV
  ? lazy(() =>
      import("./pages/__visual/VisualFixtures.tsx").then((m) => ({
        default: m.VisualResponseFixture,
      })),
    )
  : null;

// Dev-only gate fixtures — exercised by tests/visual/gates.spec.ts.
// Tree-shaken from production builds via `import.meta.env.DEV`.
const gateFixture = (name:
  | "GuestSoftGateFixture"
  | "GuestBlurGateFixture"
  | "TrialExpiredPaywallFixture"
  | "FreeUserLockedNavFixture"
  | "SubscribedUserUnlockedNavFixture"
  | "GuestLandingHeroFixture"
  | "GuestAskOpenFixture") =>
  import.meta.env.DEV
    ? lazy(() =>
        import("./pages/__visual/GateFixtures.tsx").then((m) => ({
          default: m[name],
        })),
      )
    : null;

const GuestSoftGateFixture = gateFixture("GuestSoftGateFixture");
const GuestBlurGateFixture = gateFixture("GuestBlurGateFixture");
const TrialExpiredPaywallFixture = gateFixture("TrialExpiredPaywallFixture");
const FreeUserLockedNavFixture = gateFixture("FreeUserLockedNavFixture");
const SubscribedUserUnlockedNavFixture = gateFixture(
  "SubscribedUserUnlockedNavFixture",
);
const GuestLandingHeroFixture = gateFixture("GuestLandingHeroFixture");
const GuestAskOpenFixture = gateFixture("GuestAskOpenFixture");

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div className="dabar-grain min-h-screen">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/:slug" element={<BlogArticle />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/suspended" element={<SuspendedPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/pastor" element={<PastorDashboard />} />
              <Route path="/pastor/setup" element={<PastorSetup />} />
              <Route path="/join/:inviteCode" element={<JoinCommunity />} />
              <Route path="/share/draft/:token" element={<SharedDraftView />} />
              <Route path="/doctrine" element={<DoctrinePage />} />
              {import.meta.env.DEV && VisualAskFixture && (
                <Route path="/__visual/ask" element={<VisualAskFixture />} />
              )}
              {import.meta.env.DEV && VisualResponseFixture && (
                <Route path="/__visual/response" element={<VisualResponseFixture />} />
              )}
              {import.meta.env.DEV && GuestLandingHeroFixture && (
                <Route path="/__visual/gate/landing" element={<GuestLandingHeroFixture />} />
              )}
              {import.meta.env.DEV && GuestAskOpenFixture && (
                <Route path="/__visual/gate/ask-open" element={<GuestAskOpenFixture />} />
              )}
              {import.meta.env.DEV && GuestSoftGateFixture && (
                <Route path="/__visual/gate/soft" element={<GuestSoftGateFixture />} />
              )}
              {import.meta.env.DEV && GuestBlurGateFixture && (
                <Route path="/__visual/gate/blur" element={<GuestBlurGateFixture />} />
              )}
              {import.meta.env.DEV && TrialExpiredPaywallFixture && (
                <Route path="/__visual/gate/trial-expired" element={<TrialExpiredPaywallFixture />} />
              )}
              {import.meta.env.DEV && FreeUserLockedNavFixture && (
                <Route path="/__visual/gate/free-locked" element={<FreeUserLockedNavFixture />} />
              )}
              {import.meta.env.DEV && SubscribedUserUnlockedNavFixture && (
                <Route path="/__visual/gate/subscribed" element={<SubscribedUserUnlockedNavFixture />} />
              )}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
