
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, Activity } from "lucide-react";

export default function History() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      const response = await fetch("/api/activities?limit=50", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading history...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HistoryIcon className="h-6 w-6" />
          Activity History
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity: any) => (
              <div
                key={activity.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{activity.description}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                  {activity.metadata && (
                    <div className="mt-2">
                      <Badge variant="outline">{activity.action}</Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No activities found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
