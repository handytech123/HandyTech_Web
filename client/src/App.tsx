import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import CustomerPortal from "@/pages/customer-portal";
import AdminDashboard from "@/pages/admin";
import LiveChatAdmin from "@/pages/live-chat-admin";
import NotFound from "@/pages/not-found";
import Chatbot from "@/components/chatbot";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/customer-portal" component={CustomerPortal} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/live-chat" component={LiveChatAdmin} />
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
        <Chatbot />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
