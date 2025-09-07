import AppLayout from "@/components/layout/app-layout";
import StatsCards from "@/components/dashboard/stats-cards";
import ProjectList from "@/components/dashboard/project-list";
import TerminalPreview from "@/components/dashboard/terminal-preview";
import ActivityLog from "@/components/dashboard/activity-log";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: activities } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      const response = await apiRequest("/api/activities", "GET");
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <StatsCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjectList />

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full flex items-center space-x-3 p-3 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors" data-testid="button-create-project">
                  <i className="fas fa-plus text-primary"></i>
                  <span>Create New Project</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors" data-testid="button-import-project">
                  <i className="fas fa-upload text-foreground"></i>
                  <span>Import Project</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors" data-testid="button-export-project">
                  <i className="fas fa-download text-foreground"></i>
                  <span>Export Project</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-lg transition-colors" data-testid="button-purchase-coins">
                  <i className="fas fa-coins text-accent"></i>
                  <span>Purchase Coins</span>
                </button>
              </div>
            </div>

            <TerminalPreview />
          </div>
        </div>

        <ActivityLog />
      </div>
    </AppLayout>
  );
}