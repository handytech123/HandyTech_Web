import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackEvent, trackPageView } from "@/lib/analytics";
import { captureAttribution } from "@/lib/attribution";

const ChatWidget = lazy(() => import("@/components/chat-widget").then((module) => ({ default: module.ChatWidget })));
const Home = lazy(() => import("@/pages/home"));
const Gallery = lazy(() => import("@/pages/gallery"));
const CustomerPortal = lazy(() => import("@/pages/customer-portal"));
const PortalLogin = lazy(() => import("@/pages/portal-login"));
const PortalCallback = lazy(() => import("@/pages/portal-callback"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const AdminChat = lazy(() => import("@/pages/admin-chat"));
const LeaveReview = lazy(() => import("@/pages/leave-review"));
const ReviewThankYou = lazy(() => import("@/pages/review-thank-you"));
const QuoteThankYou = lazy(() => import("@/pages/quote-thank-you"));
const ReschedulePage = lazy(() => import("@/pages/reschedule"));
const NotFound = lazy(() => import("@/pages/not-found"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const Terms = lazy(() => import("@/pages/terms"));
const QuoteProposalPage = lazy(() => import("@/pages/quote-proposal"));
const InvoicePage = lazy(() => import("@/pages/invoice"));
const ServicesPage = lazy(() => import("@/pages/services"));
const ServiceDetailPage = lazy(() => import("@/pages/service-detail"));
const ProjectDetailPage = lazy(() => import("@/pages/project-detail"));
const ServiceAreasPage = lazy(() => import("@/pages/service-areas"));
const ServiceAreaDetailPage = lazy(() => import("@/pages/service-area-detail"));

function AnalyticsObserver() {
  const [location] = useLocation();
  useEffect(() => { captureAttribution(); }, []);
  useEffect(() => { trackPageView(location); }, [location]);
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a");
      const href = link?.getAttribute("href") || "";
      if (href.startsWith("tel:")) trackEvent("phone_call_click", { link_url: href });
      else if (href.includes("#contact")) trackEvent("quote_cta_click", { link_url: href });
      else if (href.includes("#scheduler")) trackEvent("schedule_cta_click", { link_url: href });
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/services/:slug" component={ServiceDetailPage} />
      <Route path="/projects/:slug" component={ProjectDetailPage} />
      <Route path="/service-areas" component={ServiceAreasPage} />
      <Route path="/service-areas/:slug" component={ServiceAreaDetailPage} />
      <Route path="/customer-portal" component={CustomerPortal} />
      <Route path="/portal/login" component={PortalLogin} />
      <Route path="/portal/callback" component={PortalCallback} />
      <Route path="/portal" component={CustomerPortal} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/leave-review" component={LeaveReview} />
      <Route path="/review-thank-you" component={ReviewThankYou} />
      <Route path="/quote-thank-you" component={QuoteThankYou} />
      <Route path="/reschedule/:token" component={ReschedulePage} />
      <Route path="/quote/:token" component={QuoteProposalPage} />
      <Route path="/invoice/:token" component={InvoicePage} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AnalyticsObserver />
        <Suspense fallback={<div className="min-h-screen bg-slate-50 pt-32 text-center text-slate-600">Loading HandyTech...</div>}><Router /></Suspense>
        <Suspense fallback={null}><ChatWidget /></Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
