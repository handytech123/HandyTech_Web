import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatWidget } from "@/components/chat-widget";
import Home from "@/pages/home";
import Gallery from "@/pages/gallery";
import CustomerPortal from "@/pages/customer-portal";
import PortalLogin from "@/pages/portal-login";
import PortalCallback from "@/pages/portal-callback";
import AdminDashboard from "@/pages/admin";
import AdminChat from "@/pages/admin-chat";
import LeaveReview from "@/pages/leave-review";
import ReviewThankYou from "@/pages/review-thank-you";
import QuoteThankYou from "@/pages/quote-thank-you";
import ReschedulePage from "@/pages/reschedule";
import NotFound from "@/pages/not-found";
import PrivacyPolicy from "@/pages/privacy-policy";
import Terms from "@/pages/terms";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/gallery" component={Gallery} />
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
        <Router />
        <ChatWidget />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
