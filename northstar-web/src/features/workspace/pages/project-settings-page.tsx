import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getProject,
  updateProject,
  deleteProject,
} from "../api/workspace.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "../api/workspace-query-keys";
import { useCurrentUser } from "../../auth/hooks/use-current-user";

export const ProjectSettingsPage = () => {
  const { projectId } = useParams();
  const id = Number(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const { data: project, isLoading } = useQuery({
    queryKey: workspaceKeys.project(id),
    queryFn: () => getProject(id),
    enabled: id > 0,
  });

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");

  const update = useMutation({
    mutationFn: () => updateProject(id, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.project(id) });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: any) =>
      alert(e?.response?.data?.error ?? "Failed to update project"),
  });

  const del = useMutation({
    mutationFn: () => deleteProject(id),
    onSuccess: () => {
      navigate("/workspace");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: any) =>
      alert(e?.response?.data?.error ?? "Failed to delete project"),
  });

  if (isLoading) return <p>Loading project…</p>;
  if (!project) return <p>Project not found.</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/workspace/${id}`)}
        >
          <ChevronLeft />
          Back to board
        </Button>
      </div>

      <h1 className="text-2xl font-semibold">Project Settings</h1>

      <section className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Button
          disabled={!name.trim() || update.isPending}
          onClick={() => update.mutate()}
        >
          Save changes
        </Button>
      </section>

      {isAdmin && (
        <section className="space-y-2 border-t pt-4">
          <h2 className="text-lg font-semibold">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Deleting a project removes it and all associated tasks permanently.
          </p>
          <Button
            variant="destructive"
            disabled={del.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${project.name}" and all its tasks? This cannot be undone.`,
                )
              ) {
                del.mutate();
              }
            }}
          >
            Delete project
          </Button>
        </section>
      )}
    </div>
  );
};
