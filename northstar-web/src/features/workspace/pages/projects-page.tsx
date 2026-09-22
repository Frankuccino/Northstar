import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, LayoutGrid, Clock, Search } from "lucide-react";
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

function getRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useProjects();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredProjects = data?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  if (isLoading) return <p>Loading projects…</p>;
  if (error) return <p>Failed to load projects.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Projects</h1>
          <p className="text-sm text-muted-foreground">
            AI-assisted Kanban workspaces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Create Project */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create new project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
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
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <LayoutGrid className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery ? "No projects found" : "No projects yet. Create one above!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
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
              <Card className="group relative flex h-full flex-col hover:border-primary/60">
                {isAdmin && (
                  <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <ProjectRowActions
                      project={project}
                      onEdit={setEditingProject}
                      onDelete={(p) => setDeletingProject(p)}
                    />
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col p-4">
                  <div
                    className="flex flex-1 cursor-pointer flex-col"
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/workspace/${project.id}`);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <h3 className="font-medium line-clamp-1">{project.name}</h3>
                    {project.description ? (
                      <p className="mt-1 flex-1 text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    ) : (
                      <p className="mt-1 flex-1 text-sm italic text-muted-foreground/60">
                        No description
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <LayoutGrid className="h-3 w-3" />
                        {project.taskCount ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.memberCount ?? 0}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {getRelativeTime(project.updatedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </DisintegrateItem>
          ))}
        </div>
      )}

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
