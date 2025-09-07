import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotificationPopup from "@/components/ui/notification-popup";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import NotFound from "@/pages/not-found";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Terminal from "@/pages/terminal";
import History from "@/pages/history";
import Coins from "@/pages/coins";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/terminal" component={Terminal} />
      <Route path="/terminal/:projectId" component={Terminal} />
      <Route path="/history" component={History} />
      <Route path="/coins" component={Coins} />
      {user.isAdmin && <Route path="/admin" component={Admin} />}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <NotificationPopup />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;