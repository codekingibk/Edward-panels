import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  File,
  Folder,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  Save,
  X,
  FolderOpen,
  Settings,
  Archive,
  MoreVertical,
  Move,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

import AppLayout from "@/components/layout/app-layout";

// refetchFiles is provided by the useQuery hook below

// Placeholder for apiRequest function, assuming it exists in the project context
const apiRequest = async (url: string, method: string, data?: any) => {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }
  return response.json();
};


export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState("");
  const [command, setCommand] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);

  // State for the new create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<"file" | "folder">("file");
  const [newItemName, setNewItemName] = useState("");

  // State for rename dialog
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renamingFile, setRenamingFile] = useState<string>("");
  const [newFileName, setNewFileName] = useState("");

  // Project Configuration and File Operations State
  const [startupCommand, setStartupCommand] = useState('npm start');
  const [showUpload, setShowUpload] = useState(false);

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch project");
      return response.json();
    },
  });

  const { data: files = [], refetch: refetchFiles } = useQuery({
    queryKey: [`/api/projects/${projectId}/files`, currentPath],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/files?path=${encodeURIComponent(currentPath)}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      return data.files || [];
    },
    enabled: !!projectId,
  });

  const executeCommand = useMutation({
    mutationFn: async (cmd: string) => {
      const response = await fetch(`/api/projects/${projectId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ command: cmd }),
      });
      if (!response.ok) throw new Error("Failed to execute command");
      return response.json();
    },
    onSuccess: (data) => {
      const output = `$ ${command}\n${data.output}${data.error ? `\nError: ${data.error}` : ""}`;
      setTerminalOutput((prev) => [...prev, output]);
      setCommand("");
      // Scroll to bottom
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, 100);
    },
  });

  const saveFile = useMutation({
    mutationFn: async ({ filePath, content }: { filePath: string; content: string }) => {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ filePath, content }),
      });
      if (!response.ok) throw new Error("Failed to save file");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "File saved successfully" });
      setEditingFile(null);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`, currentPath] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save file.",
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/projects/${projectId}/files/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (data) => {
      if (!data.isZip) {
        toast({
          title: "File Uploaded",
          description: "File has been uploaded successfully.",
        });
        setShowUpload(false);
        refetchFiles();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload file.",
        variant: "destructive",
      });
    },
  });

  const archiveProject = useMutation({
    mutationFn: () => fetch(`/api/projects/${projectId}/archive`, { method: "POST", credentials: "include" }),
    onSuccess: () => {
      toast({
        title: "Project Archived",
        description: "Project has been archived successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive project.",
        variant: "destructive",
      });
    },
  });

  const updateStartupCommand = useMutation({
    mutationFn: () =>
      fetch(`/api/projects/${projectId}/startup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ command: startupCommand }),
      }),
    onSuccess: () => {
      toast({
        title: "Startup Command Updated",
        description: "Project startup command has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update startup command.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/projects/${projectId}/files/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      setShowUpload(false);
      refetchFiles();
      e.target.value = ''; // Reset file input
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.zip')) {
      toast({
        title: "Error",
        description: "Please select a valid ZIP file",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('zipfile', file);

      const response = await fetch(`/api/projects/${projectId}/files/extract`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Extraction failed');
      }

      toast({
        title: "Success",
        description: "ZIP file extracted successfully",
      });

      setShowUpload(false);
      refetchFiles();
      e.target.value = ''; // Reset file input
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to extract ZIP file",
        variant: "destructive",
      });
    }
  };

  const extractZip = useMutation({
    mutationFn: (filePath: string) =>
      fetch(`/api/projects/${projectId}/files/extract`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      }),
    onSuccess: () => {
      toast({
        title: "ZIP Extracted",
        description: "ZIP file has been extracted successfully.",
      });
      // Refresh file list after extraction
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`, currentPath] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to extract ZIP file.",
        variant: "destructive",
      });
    },
  });


  const handleFileClick = async (file: any) => {
    if (file.isDirectory) {
      setCurrentPath(currentPath ? `${currentPath}/${file.name}` : file.name);
    } else {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/files?path=${encodeURIComponent(
            currentPath ? `${currentPath}/${file.name}` : file.name
          )}`,
          { credentials: "include" }
        );
        if (response.ok) {
          const data = await response.json();
          setFileContent(data.content || "");
          setEditingFile(currentPath ? `${currentPath}/${file.name}` : file.name);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load file content",
          variant: "destructive",
        });
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const pathParts = currentPath.split("/");
    const newPath = pathParts.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  const createNewFile = () => {
    setCreateType("file");
    setNewItemName("");
    setShowCreateDialog(true);
  };

  const createNewFolder = () => {
    setCreateType("folder");
    setNewItemName("");
    setShowCreateDialog(true);
  };

  const handleCreateItem = async () => {
    if (!newItemName.trim()) return;

    const filePath = currentPath ? `${currentPath}/${newItemName}` : newItemName;

    try {
      const response = await fetch(`/api/projects/${projectId}/files/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filePath: filePath,
          type: createType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create item");
      }

      toast({ title: `${createType === "file" ? "File" : "Folder"} created successfully` });
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`, currentPath] });
    } catch (error: any) {
      toast({
        title: "Error creating item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadFile = async (fileName: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files/download?path=${encodeURIComponent(fileName)}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const deleteFile = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      await apiRequest(`/api/projects/${projectId}/files`, "DELETE", {
        filePath: fileName
      });

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      refetchFiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const renameFile = async () => {
    if (!newFileName.trim() || !renamingFile) return;

    try {
      const oldPath = currentPath ? `${currentPath}/${renamingFile}` : renamingFile;
      const newPath = currentPath ? `${currentPath}/${newFileName}` : newFileName;

      await apiRequest(`/api/projects/${projectId}/files/move`, "POST", {
        oldPath,
        newPath
      });

      toast({
        title: "Success",
        description: "File renamed successfully",
      });

      setShowRenameDialog(false);
      setRenamingFile("");
      setNewFileName("");
      refetchFiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to rename file",
        variant: "destructive",
      });
    }
  };

  const startRename = (fileName: string) => {
    setRenamingFile(fileName);
    setNewFileName(fileName);
    setShowRenameDialog(true);
  };

  const editFile = (fileName: string) => {
    handleFileClick({ name: fileName, isDirectory: false });
  };


  if (!project) {
    return <div className="p-6">Loading project...</div>;
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
          <Badge variant={project.status === "running" ? "default" : "secondary"}>
            {project.status}
          </Badge>
        </div>

        {/* Project Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Project Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startupCommand">Startup Command</Label>
                <div className="flex space-x-2">
                  <Input
                    id="startupCommand"
                    value={startupCommand}
                    onChange={(e) => setStartupCommand(e.target.value)}
                    placeholder="npm start"
                  />
                  <Button
                    onClick={() => updateStartupCommand.mutate()}
                    disabled={updateStartupCommand.isPending}
                  >
                    Update
                  </Button>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => archiveProject.mutate()}
                  disabled={archiveProject.isPending}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Project
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/api/projects/${projectId}/export`, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Project
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Explorer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="h-5 w-5" />
                  <span>File Explorer</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={createNewFile}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    File
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={createNewFolder}
                  >
                    <FolderOpen className="h-4 w-4 mr-1" />
                    Folder
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUpload(true)}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
              </CardTitle>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <button
                  onClick={() => setCurrentPath("")}
                  className="hover:text-foreground"
                >
                  root
                </button>
                {currentPath.split("/").filter(Boolean).map((part, index) => (
                  <span key={index} className="flex items-center gap-1">
                    <span>/</span>
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className="hover:text-foreground"
                    >
                      {part}
                    </button>
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {currentPath && (
                  <div
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => {
                      const pathParts = currentPath.split("/");
                      pathParts.pop();
                      setCurrentPath(pathParts.join("/"));
                    }}
                  >
                    <Folder className="h-4 w-4" />
                    <span>..</span>
                  </div>
                )}
                {files.map((file: any) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => handleFileClick(file)}
                  >
                    {file.isDirectory ? (
                      <Folder className="h-4 w-4 text-blue-500" />
                    ) : (
                      <File className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="flex-1">{file.name}</span>
                    {!file.isDirectory && (
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)}KB
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!file.isDirectory && (
                          <>
                            <DropdownMenuItem onClick={() => editFile(file.name)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadFile(file.name)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => startRename(file.name)}>
                          <Move className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteFile(file.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Terminal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Terminal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={terminalRef}
                className="bg-black text-green-400 font-mono text-sm p-4 rounded h-64 overflow-y-auto mb-4"
              >
                {terminalOutput.map((output, index) => (
                  <div key={index} className="whitespace-pre-wrap mb-2">
                    {output}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const cmd = project.startupCommand || startupCommand || "npm start";
                    executeCommand.mutate(cmd);
                  }}
                  disabled={executeCommand.isPending}
                  className="min-w-20"
                >
                  Start
                </Button>
                <Input
                  placeholder="Enter command..."
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && command.trim()) {
                      executeCommand.mutate(command.trim());
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (command.trim()) {
                      executeCommand.mutate(command.trim());
                    }
                  }}
                  disabled={executeCommand.isPending || !command.trim()}
                >
                  Run
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Editor */}
        {editingFile && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Editing: {editingFile}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      saveFile.mutate({ filePath: editingFile, content: fileContent });
                    }}
                    disabled={saveFile.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="min-h-96 font-mono text-sm"
                placeholder="File content..."
              />
            </CardContent>
          </Card>
        )}

        {/* Create Item Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New {createType === "file" ? "File" : "Folder"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item-name">
                  {createType === "file" ? "File" : "Folder"} Name
                </Label>
                <Input
                  id="item-name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`Enter ${createType} name...`}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleCreateItem();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateItem} disabled={!newItemName.trim()}>
                  Create {createType === "file" ? "File" : "Folder"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename Dialog */}
        <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename {renamingFile}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-name">New Name</Label>
                <Input
                  id="new-name"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Enter new name..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      renameFile();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={renameFile} disabled={!newFileName.trim()}>
                  Rename
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upload Dialog */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Upload Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Upload Single File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                  />
                </div>
                <div>
                  <Label htmlFor="zip-upload">Upload & Extract ZIP</Label>
                  <Input
                    id="zip-upload"
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ZIP files will be automatically extracted
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUpload(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}