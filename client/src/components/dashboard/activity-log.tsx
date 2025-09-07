import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Edit, Download, Plus, MoreHorizontal } from "lucide-react";

export default function ActivityLog() {
  const { toast } = useToast();
  
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["/api/activities"],
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "project_created":
        return <Plus className="h-4 w-4 text-accent" />;
      case "project_started":
        return <Play className="h-4 w-4 text-accent" />;
      case "file_modified":
        return <Edit className="h-4 w-4 text-primary" />;
      case "command_executed":
        return <Download className="h-4 w-4 text-secondary-foreground" />;
      default:
        return <MoreHorizontal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4">
              <div className="w-8 h-8 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button variant="outline" size="sm" data-testid="button-view-all-activity">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-lg mx-auto mb-4 flex items-center justify-center">
              <MoreHorizontal className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity: any) => (
              <div key={activity.id} className="flex items-center space-x-4" data-testid={`activity-${activity.id}`}>
                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" data-testid={`activity-description-${activity.id}`}>
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
