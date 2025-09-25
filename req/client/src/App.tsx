import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Gallery from "@/pages/gallery";
import CustomerPortal from "@/pages/customer-portal";
import PortalLogin from "@/pages/portal-login";
import PortalCallback from "@/pages/portal-callback";
import AdminDashboard from "@/pages/admin";
import LiveChatAdmin from "@/pages/live-chat-admin";
import LeaveReview from "@/pages/leave-review";
import ReschedulePage from "@/pages/reschedule";
import NotFound from "@/pages/not-found";

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
      <Route path="/live-chat" component={LiveChatAdmin} />
      <Route path="/live-chat/:sessionId" component={LiveChatAdmin} />
      <Route path="/leave-review" component={LeaveReview} />
      <Route path="/reschedule/:token" component={ReschedulePage} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
