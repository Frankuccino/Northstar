import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { useProjects } from "../hooks/use-projects";
import { useCurrentUser } from "../../auth/hooks/use-current-user";
import { createProject, deleteProject } from "../api/workspace.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "../api/workspace-query-keys";

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useProjects();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const create = useMutation({
    mutationFn: () => createProject({ name, description: description || undefined }),
    onSuccess: () => {
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projects() });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      await Promise.all(selectedIds.map((id) => deleteProject(id)));
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projects() });
    },
    onError: (e: any) => alert(e?.response?.data?.error ?? "Failed to delete projects"),
  });

  const singleDelete = useMutation({
    mutationFn: async (id: number) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projects() });
    },
    onError: (e: any) => alert(e?.response?.data?.error ?? "Failed to delete project"),
  });

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  if (isLoading) return <p>Loading projects…</p>;
  if (error) return <p>Failed to load projects.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          AI-assisted Kanban workspaces.
        </p>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="project-name">New project</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="project-desc">Description</Label>
          <Input
            id="project-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <Button
          disabled={!name || create.isPending}
          onClick={() => create.mutate()}
        >
          Create
        </Button>
      </Card>

      {isAdmin && selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <p className="text-sm">{selectedIds.length} selected</p>
          <Button
            variant="destructive"
            size="sm"
            disabled={bulkDelete.isPending}
            onClick={() => {
              if (window.confirm(`Delete ${selectedIds.length} project(s)?`)) {
                bulkDelete.mutate();
              }
            }}
          >
            Delete selected
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((project) => {
          const checked = selectedIds.includes(project.id);
          return (
            <Card
              key={project.id}
              className={`p-4 hover:border-primary/60 ${
                isAdmin ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <div className="flex items-start gap-3">
                {isAdmin && (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      toggleSelect(project.id, Boolean(v))
                    }
                    className="mt-1"
                  />
                )}
                <div
                  className={`flex-1 ${isAdmin ? "" : "cursor-pointer"}`}
                  onClick={() => navigate(`/workspace/${project.id}`)}
                  onKeyDown={(e) => {
                    if (!isAdmin && e.key === "Enter") navigate(`/workspace/${project.id}`);
                  }}
                  role={isAdmin ? undefined : "button"}
                  tabIndex={isAdmin ? undefined : 0}
                >
                  <h3 className="font-medium">{project.name}</h3>
                  {project.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    disabled={singleDelete.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${project.name}" and all its tasks?`)) {
                        singleDelete.mutate(project.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
