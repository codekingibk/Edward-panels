import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateProjectModal from "@/components/modals/create-project-modal";
import { Plus, MoreVertical, Play, Square, Trash2 } from "lucide-react";

export default function ProjectList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
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

  const startProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest(`/api/projects/${projectId}/start`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Started",
        description: "Your project is now running.",
      });
    },
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
        return;
      }
      toast({
        title: "Error",
        description: "Failed to start project.",
        variant: "destructive",
      });
    },
  });

  const stopProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest(`/api/projects/${projectId}/stop`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Stopped",
        description: "Your project has been stopped.",
      });
    },
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
        return;
      }
      toast({
        title: "Error",
        description: "Failed to stop project.",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest(`/api/projects/${projectId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Deleted",
        description: "Your project has been deleted permanently.",
      });
    },
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
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete project.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge className="bg-accent/10 text-accent">Running</Badge>;
      case "stopped":
        return <Badge variant="secondary">Stopped</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getProjectIcon = (template: string) => {
    switch (template) {
      case "express":
        return "fab fa-node-js";
      case "discord-bot":
        return "fas fa-robot";
      case "react":
        return "fab fa-react";
      default:
        return "fas fa-cube";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-muted rounded-lg"></div>
                    <div>
                      <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Projects</CardTitle>
            <Button 
              onClick={() => setShowCreateModal(true)}
              data-testid="button-new-project"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-project">
                Create your first project
              </Button>
            </div>
          ) : (
            projects.map((project: any) => (
              <div 
                key={project.id} 
                className="bg-muted/30 border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
                data-testid={`project-card-${project.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <i className={`${getProjectIcon(project.template)} text-primary`}></i>
                    </div>
                    <div>
                      <h4 className="font-medium" data-testid={`project-name-${project.id}`}>
                        {project.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {project.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(project.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid={`project-menu-${project.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {project.status === "running" ? (
                          <DropdownMenuItem 
                            onClick={() => stopProjectMutation.mutate(project.id)}
                            disabled={stopProjectMutation.isPending}
                            data-testid={`button-stop-${project.id}`}
                          >
                            <Square className="mr-2 h-4 w-4" />
                            Stop
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => startProjectMutation.mutate(project.id)}
                            disabled={startProjectMutation.isPending}
                            data-testid={`button-start-${project.id}`}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Start
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => deleteProjectMutation.mutate(project.id)}
                          disabled={deleteProjectMutation.isPending}
                          className="text-destructive focus:text-destructive"
                          data-testid={`button-delete-${project.id}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                  <span>Node.js {project.nodeVersion}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <CreateProjectModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
      />
    </>
  );
}
