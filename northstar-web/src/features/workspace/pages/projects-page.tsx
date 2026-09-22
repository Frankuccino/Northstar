import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, LayoutGrid, Search } from "lucide-react";
import { useProjects } from "../hooks/use-projects";
import { useCurrentUser } from "../../auth/hooks/use-current-user";
import { createProject } from "../api/workspace.api";
import { useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "../api/workspace-query-keys";
import { ProjectRowActions } from "../components/project-row-actions";
import { EditProjectDialog } from "../components/edit-project-dialog";
import { DisintegrateItem } from "@/features/theme/disintegrate-item";
import { useDeleteProject } from "../hooks/use-delete-project";
import { ConfirmDeleteDialog } from "../components/confirm-delete-dialog";
import { useToast } from "@/features/theme/toast";
import type { Project } from "../types/workspace";

function getRelativeTime(date: string): string {
  if (!date) return "—";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return "Just now";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [disintegratingProjectId, setDisintegratingProjectId] = useState<number | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const deleteProjectMutation = useDeleteProject();

  const { toast } = useToast();

  const filteredProjects = data?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  if (isLoading) return <p>Loading projects…</p>;
  if (error) return <p>Failed to load projects.</p>;

  const handleCreateProject = () => {
    const name = prompt("Project name:");
    if (name?.trim()) {
      createProject({ name: name.trim() }).then(() => {
        queryClient.invalidateQueries({ queryKey: workspaceKeys.projects() });
        toast({ type: "success", title: "Project created" });
      }).catch((err: any) => {
        toast({ type: "error", title: "Failed to create project", description: err?.response?.data?.error });
      });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          AI-assisted Kanban workspaces.
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <Button onClick={handleCreateProject} size="sm">
          <Plus className="h-4 w-4" />
          New project
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="pl-9"
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
          <LayoutGrid className="h-8 w-8 opacity-50" />
          <p className="mt-2 text-sm">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <Card className="group relative hover:border-primary/60 transition-colors" size="sm">
                {isAdmin && (
                  <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 z-10">
                    <ProjectRowActions
                      project={project}
                      onEdit={setEditingProject}
                      onDelete={(p) => setDeletingProject(p)}
                    />
                  </div>
                )}
                <CardContent className="p-2">
                  <div
                    className="flex flex-col cursor-pointer"
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/workspace/${project.id}`);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <h3 className="font-medium line-clamp-1 text-sm">{project.name}</h3>
                    {project.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs italic text-muted-foreground/60">
                        No description
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-border">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <LayoutGrid className="h-3 w-3" />
                          {project.taskCount ?? 0}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Users className="h-3 w-3" />
                          {project.memberCount ?? 0}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {getRelativeTime(project.createdAt)}
                      </span>
                    </div>
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
