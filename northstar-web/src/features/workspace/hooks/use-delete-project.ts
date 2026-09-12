import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProject } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";
import { useToast } from "@/features/theme/toast";

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projects() });
      toast({ type: "success", title: "Project deleted" });
    },
    onError: (err: any) => {
      toast({ type: "error", title: "Failed to delete project", description: err?.response?.data?.error });
    },
  });
};
