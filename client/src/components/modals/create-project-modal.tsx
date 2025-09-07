import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coins } from "lucide-react";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template: "blank",
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/admin/settings"],
    enabled: open,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("/api/projects", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Project Created",
        description: "Your new project has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setFormData({ name: "", description: "", template: "blank" });
      onOpenChange(false);
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
      
      const message = error.message.includes("Insufficient coins") 
        ? "You don't have enough coins to create a project."
        : "Failed to create project. Please try again.";
        
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(formData.name)) {
      toast({
        title: "Validation Error",
        description: "Project name can only contain letters, numbers, hyphens, and underscores.",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate(formData);
  };

  const templates = [
    { value: "blank", label: "Blank Project", description: "Start with an empty Node.js project" },
    { value: "express", label: "Express.js API", description: "REST API server with Express.js" },
    { value: "discord-bot", label: "Discord Bot", description: "Discord bot with basic commands" },
    { value: "react", label: "React App", description: "React application with Node.js backend" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="create-project-modal">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new Node.js project. Each project runs in its own isolated environment.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="my-awesome-project"
              data-testid="input-project-name"
            />
            <p className="text-xs text-muted-foreground">
              Only letters, numbers, hyphens, and underscores allowed
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project-description">Description (Optional)</Label>
            <Textarea
              id="project-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your project..."
              className="h-20"
              data-testid="input-project-description"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={formData.template} onValueChange={(value) => setFormData({ ...formData, template: value })}>
              <SelectTrigger data-testid="select-project-template">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.value} value={template.value}>
                    <div>
                      <div className="font-medium">{template.label}</div>
                      <div className="text-xs text-muted-foreground">{template.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Project Cost:</span>
              <div className="flex items-center space-x-1">
                <Coins className="h-4 w-4 text-accent" />
                <span className="font-medium" data-testid="text-project-cost">
                  {settings?.projectCost || 100} coins
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-project"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createProjectMutation.isPending}
              data-testid="button-create-project"
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
