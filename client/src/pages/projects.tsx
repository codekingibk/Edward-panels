
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Square, Trash2, FolderOpen } from "lucide-react";
import CreateProjectModal from "@/components/modals/create-project-modal";
import { Link } from "wouter";

import AppLayout from "@/components/layout/app-layout";

export default function Projects() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  const startProject = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/start`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to start project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project started successfully" });
    },
  });

  const stopProject = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/stop`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to stop project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project stopped successfully" });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted successfully" });
    },
  });

  if (!user) {
    return <div>Please log in to view projects.</div>;
  }

  if (isLoading) {
    return <div className="p-6">Loading projects...</div>;
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: any) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge variant={project.status === "running" ? "default" : "secondary"}>
                  {project.status}
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground text-sm">{project.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Link href={`/projects/${project.id}`}>
                  <Button variant="outline" size="sm">
                    <FolderOpen className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                </Link>
                {project.status === "running" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stopProject.mutate(project.id)}
                    disabled={stopProject.isPending}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startProject.mutate(project.id)}
                    disabled={startProject.isPending}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteProject.mutate(project.id)}
                  disabled={deleteProject.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">Create your first project to get started</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      )}

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      </div>
    </AppLayout>
  );
}
