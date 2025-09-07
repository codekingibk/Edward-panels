import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Users, DollarSign, Globe } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  coinBalance: number;
  isAdmin: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
}

interface AdminSettings {
  siteName: string;
  siteDescription: string;
  welcomeCoins: number;
  projectCost: number;
}

// Placeholder for getQueryFn, assuming it's defined elsewhere or needs to be implemented
// For the purpose of this edit, we'll assume it exists and works correctly.
const getQueryFn = (params: any) => async () => {
  const response = await apiRequest("/api/admin/duplicates", "GET", params);
  if (!response.ok) {
    throw new Error("Failed to fetch duplicate accounts");
  }
  return response.json();
};


export default function Admin() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [settingsForm, setSettingsForm] = useState<AdminSettings>({
    siteName: "",
    siteDescription: "",
    welcomeCoins: 1000,
    projectCost: 100,
  });

  const [broadcastMessage, setBroadcastMessage] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [user, isLoading, toast]);

  // Fetch admin data with proper error handling
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/users", "GET");
      return response.json();
    },
    enabled: !!user?.isAdmin,
    retry: 3,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/settings", "GET");
      return response.json();
    },
    enabled: !!user?.isAdmin,
  });

  const { data: projects } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const response = await apiRequest("/api/admin/projects", "GET");
      return response.json();
    },
    enabled: !!user?.isAdmin,
  });

  // Fetch duplicate accounts
  const { data: duplicateAccounts = [] } = useQuery({
    queryKey: ["/api/admin/duplicates"],
    queryFn: getQueryFn({}),
  });


  // Update form when settings data changes
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        siteName: settings.siteName || "",
        siteDescription: settings.siteDescription || "",
        welcomeCoins: settings.welcomeCoins || 1000,
        projectCost: settings.projectCost || 100,
      });
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (data: AdminSettings) => {
      const response = await apiRequest("/api/admin/settings", "PUT", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Site settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const updateUserCoins = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      const response = await apiRequest(`/api/admin/users/${userId}/coins`, "POST", { amount });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Coins Updated",
        description: "User coins have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user coins.",
        variant: "destructive",
      });
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: string }) => {
      const response = await apiRequest(`/api/admin/users/${userId}/status`, "PUT", { action });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Status Updated",
        description: "User status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status.",
        variant: "destructive",
      });
    },
  });

  const sendBroadcast = useMutation({
    mutationFn: async ({ message, target }: { message: string; target: string }) => {
      const response = await apiRequest("/api/admin/broadcast", "POST", { message, target });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Broadcast message has been sent successfully.",
      });
      setBroadcastMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send broadcast message.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Calculate real stats
  const totalUsers = users?.length || 0;
  const totalProjects = projects?.length || 0;
  const totalCoinsIssued = users?.reduce((total: number, user: User) => total + user.coinBalance, 0) || 0;
  const projectCost = settings?.projectCost || 100;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage Edward Panels settings and users</p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-xs text-muted-foreground">Created projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coins Issued</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCoinsIssued}</div>
              <p className="text-xs text-muted-foreground">Total coins in circulation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Project Cost</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectCost}</div>
              <p className="text-xs text-muted-foreground">Coins per project</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Site Settings</CardTitle>
            <CardDescription>Configure Edward Panels settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settingsForm.siteName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, siteName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="welcomeCoins">Welcome Coins</Label>
                <Input
                  id="welcomeCoins"
                  type="number"
                  value={settingsForm.welcomeCoins}
                  onChange={(e) => setSettingsForm({ ...settingsForm, welcomeCoins: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="projectCost">Project Cost (Coins)</Label>
                <Input
                  id="projectCost"
                  type="number"
                  value={settingsForm.projectCost}
                  onChange={(e) => setSettingsForm({ ...settingsForm, projectCost: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={settingsForm.siteDescription}
                onChange={(e) => setSettingsForm({ ...settingsForm, siteDescription: e.target.value })}
              />
            </div>
            <Button
              onClick={() => updateSettings.mutate(settingsForm)}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and coin balances</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {usersError && (
              <div className="text-center py-8 text-red-500">
                Error loading users. Please refresh the page.
              </div>
            )}

            {users && users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found.
              </div>
            )}

            {users && users.length > 0 && (
              <div className="space-y-4">
                {users.map((userData: User) => (
                  <div key={userData.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{userData.username}</p>
                      <p className="text-sm text-muted-foreground">{userData.email}</p>
                      <p className="text-sm text-muted-foreground">Coins: {userData.coinBalance}</p>
                      <div className="flex gap-2 mt-1">
                        {userData.isAdmin && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            Admin
                          </span>
                        )}
                        {userData.isBanned && (
                          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                            Banned
                          </span>
                        )}
                        {userData.isSuspended && (
                          <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                            Suspended
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateUserCoins.mutate({ userId: userData.id, amount: 200 })}
                        disabled={updateUserCoins.isPending}
                      >
                        +200 Coins
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateUserCoins.mutate({ userId: userData.id, amount: 500 })}
                        disabled={updateUserCoins.isPending}
                      >
                        +500 Coins
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserCoins.mutate({ userId: userData.id, amount: -100 })}
                        disabled={updateUserCoins.isPending}
                      >
                        -100 Coins
                      </Button>
                      {!userData.isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant={userData.isBanned ? "default" : "destructive"}
                            onClick={() => toggleUserStatus.mutate({
                              userId: userData.id,
                              action: userData.isBanned ? "unban" : "ban"
                            })}
                            disabled={toggleUserStatus.isPending}
                          >
                            {userData.isBanned ? "Unban" : "Ban"}
                          </Button>
                          <Button
                            size="sm"
                            variant={userData.isSuspended ? "default" : "secondary"}
                            onClick={() => toggleUserStatus.mutate({
                              userId: userData.id,
                              action: userData.isSuspended ? "unsuspend" : "suspend"
                            })}
                            disabled={toggleUserStatus.isPending}
                          >
                            {userData.isSuspended ? "Unsuspend" : "Suspend"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Broadcast Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Broadcast Messages</CardTitle>
            <CardDescription>Send messages to users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="broadcastMessage">Message</Label>
                <Textarea
                  id="broadcastMessage"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter broadcast message..."
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => sendBroadcast.mutate({ message: broadcastMessage, target: "all" })}
                  disabled={sendBroadcast.isPending || !broadcastMessage.trim()}
                >
                  {sendBroadcast.isPending ? "Sending..." : "Send to All Users"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendBroadcast.mutate({ message: broadcastMessage, target: "active" })}
                  disabled={sendBroadcast.isPending || !broadcastMessage.trim()}
                >
                  {sendBroadcast.isPending ? "Sending..." : "Send to Active Users Only"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Potential Duplicate Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Potential Duplicate Accounts</CardTitle>
            <CardDescription>Users sharing device fingerprints or IP addresses</CardDescription>
          </CardHeader>
          <CardContent>
            {duplicateAccounts.length === 0 ? (
              <p className="text-muted-foreground">No duplicate accounts detected</p>
            ) : (
              <div className="space-y-4">
                {duplicateAccounts.map((group: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Fingerprint Group {index + 1}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Fingerprint: {group.fingerprint.substring(0, 16)}...
                    </p>
                    <div className="space-y-2">
                      {group.users.map((user: any) => (
                        <div key={user.id} className="flex justify-between items-center bg-muted p-2 rounded">
                          <div>
                            <span className="font-medium">{user.username}</span>
                            <span className="text-sm text-muted-foreground ml-2">({user.email})</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created: {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}