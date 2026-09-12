import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProject } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";
import { toast } from "sonner";

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string | null } }) =>
      updateProject(id, data),
    onSuccess: (data) => {
      // Update cache immediately - no invalidateQueries to avoid flicker
      queryClient.setQueryData(workspaceKeys.project(data.id), data);
      toast.success("Project updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? "Failed to update project");
    },
  });
};
