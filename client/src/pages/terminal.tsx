
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon } from "lucide-react";

export default function Terminal() {
  const [command, setCommand] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Welcome to Edward Panels Terminal",
    "Select a project to run commands in its environment.",
    "",
  ]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const terminalRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const executeCommand = useMutation({
    mutationFn: async (cmd: string) => {
      if (!selectedProject) {
        throw new Error("Please select a project first");
      }
      const response = await fetch(`/api/projects/${selectedProject}/execute`, {
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
      setTerminalOutput(prev => [...prev, output]);
      setCommand("");
    },
    onError: (error) => {
      setTerminalOutput(prev => [...prev, `Error: ${error.message}`]);
    },
  });

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TerminalIcon className="h-6 w-6" />
          Terminal
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select a project...</option>
            {projects.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.status})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terminal Output</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={terminalRef}
            className="bg-black text-green-400 font-mono text-sm p-4 rounded h-96 overflow-y-auto mb-4"
          >
            {terminalOutput.map((output, index) => (
              <div key={index} className="whitespace-pre-wrap mb-1">
                {output}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={selectedProject ? "Enter command..." : "Select a project first"}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && command.trim() && selectedProject) {
                  executeCommand.mutate(command.trim());
                }
              }}
              disabled={!selectedProject}
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (command.trim()) {
                  executeCommand.mutate(command.trim());
                }
              }}
              disabled={executeCommand.isPending || !command.trim() || !selectedProject}
            >
              Run
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
