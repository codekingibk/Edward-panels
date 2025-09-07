import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Coins, HardDrive, Terminal } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16 mb-4"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Active Projects",
      value: stats?.activeProjects || 0,
      change: "+2 from last month",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Coin Balance", 
      value: stats?.coinBalance?.toLocaleString() || "0",
      change: "Buy more coins",
      icon: Coins,
      color: "text-accent",
      bgColor: "bg-accent/10",
      isClickable: true
    },
    {
      title: "Storage Used",
      value: stats?.storageUsed || "0 GB",
      change: `60% of ${stats?.storageLimit || "4 GB"} limit`,
      icon: HardDrive,
      color: "text-secondary-foreground",
      bgColor: "bg-secondary/50",
      showProgress: true
    },
    {
      title: "Commands Run",
      value: stats?.commandsToday || 0,
      change: "Today",
      icon: Terminal,
      color: "text-foreground",
      bgColor: "bg-muted/50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{stat.title}</p>
                <p 
                  className={`text-2xl font-bold ${stat.color}`} 
                  data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`${stat.color}`} />
              </div>
            </div>
            
            <div className="mt-4">
              {stat.showProgress && (
                <div className="mb-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "60%" }}></div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center text-sm">
                {stat.isClickable ? (
                  <button 
                    className="text-primary hover:underline"
                    data-testid="button-buy-coins"
                  >
                    {stat.change}
                  </button>
                ) : index === 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 text-accent mr-1" />
                    <span className="text-accent">+2</span>
                    <span className="text-muted-foreground ml-1">from last month</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{stat.change}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
