
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { X } from "lucide-react";
import { Button } from "./button";

interface Broadcast {
  id: string;
  message: string;
  timestamp: string;
  target: string;
}

export default function NotificationPopup() {
  const { user } = useAuth();
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<string[]>([]);
  
  const { data: broadcasts } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: async () => {
      const response = await apiRequest("/api/broadcasts", "GET");
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // Check for new broadcasts every 30 seconds
  });

  const activeBroadcasts = broadcasts?.filter((broadcast: Broadcast) => 
    !dismissedBroadcasts.includes(broadcast.id)
  ) || [];

  const dismissBroadcast = (broadcastId: string) => {
    setDismissedBroadcasts(prev => [...prev, broadcastId]);
  };

  if (!activeBroadcasts.length) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {activeBroadcasts.map((broadcast: Broadcast) => (
        <div
          key={broadcast.id}
          className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-right"
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="font-medium">Announcement</div>
              <p className="text-sm opacity-90 mt-1">{broadcast.message}</p>
              <p className="text-xs opacity-75 mt-2">
                {new Date(broadcast.timestamp).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-primary-foreground/20"
              onClick={() => dismissBroadcast(broadcast.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
