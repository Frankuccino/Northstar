import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, LayoutGrid } from "lucide-react";
import { useProjects } from "../hooks/use-projects";
import { useCurrentUser } from "../../auth/hooks/use-current-user";
import { createProject } from "../api/workspace.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "../api/workspace-query-keys";
import { ProjectRowActions } from "../components/project-row-actions";
import { EditProjectDialog } from "../components/edit-project-dialog";
import { DisintegrateItem } from "@/features/theme/disintegrate-item";
import { useDeleteProject } from "../hooks/use-delete-project";
import { ConfirmDeleteDialog } from "../components/confirm-delete-dialog";
import { useToast } from "@/features/theme/toast";
import type { Project } from "../types/workspace";

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useProjects();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [disintegratingProjectId, setDisintegratingProjectId] = useState<number | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const deleteProjectMutation = useDeleteProject();

  const { toast } = useToast();

  const create = useMutation({
    mutationFn: () =>
      createProject({ name, description: description || undefined }),
    onSuccess: () => {
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projects() });
      toast({ type: "success", title: "Project created" });
    },
    onError: (err: any) => {
      toast({ type: "error", title: "Failed to create project", description: err?.response?.data?.error });
    },
  });

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

      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="project-name">New project</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
          />
        </div>
        <div className="flex-1 space-y-2">
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
          <Plus className="mr-1 h-4 w-4" />
          Create
        </Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((project) => (
          <DisintegrateItem
            key={project.id}
            active={disintegratingProjectId === project.id}
            onComplete={() => {
              setDisintegratingProjectId(null);
              deleteProjectMutation.mutate(project.id, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: workspaceKeys.projects() });
                },
              });
            }}
          >
            <Card className="group relative flex h-full min-h-[120px] flex-col p-4 hover:border-primary/60">
              {isAdmin && (
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <ProjectRowActions
                    project={project}
                    onEdit={setEditingProject}
                    onDelete={(p) => setDeletingProject(p)}
                  />
                </div>
              )}
              <div
                className="flex flex-1 cursor-pointer flex-col pr-8"
                onClick={() => navigate(`/workspace/${project.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/workspace/${project.id}`);
                }}
                role="button"
                tabIndex={0}
              >
                <h3 className="font-medium line-clamp-1">{project.name}</h3>
                {project.description ? (
                  <p className="mt-1 flex-1 text-sm text-muted-foreground line-clamp-3">
                    {project.description}
                  </p>
                ) : (
                  <p className="mt-1 flex-1 text-sm italic text-muted-foreground/60">
                    No description
                  </p>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <LayoutGrid className="h-3 w-3" />
                  <span>{project.taskCount ?? 0} tasks</span>
                </div>
              </div>
            </Card>
          </DisintegrateItem>
        ))}
      </div>

      <EditProjectDialog
        open={!!editingProject}
        project={editingProject}
        onClose={() => setEditingProject(null)}
      />

      {deletingProject && (
        <ConfirmDeleteDialog
          project={deletingProject}
          totalTasks={deletingProject.taskCount ?? 0}
          onOpenChange={(open) => {
            if (!open) setDeletingProject(null);
          }}
          onConfirm={() => {
            setDisintegratingProjectId(deletingProject.id);
          }}
        />
      )}
    </div>
  );
};
