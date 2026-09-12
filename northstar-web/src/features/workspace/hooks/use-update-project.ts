import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProject } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";
import { useToast } from "@/features/theme/toast";

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string | null } }) =>
      updateProject(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(workspaceKeys.project(data.id), data);
      toast({ type: "success", title: "Project updated" });
    },
    onError: (err: any) => {
      toast({ type: "error", title: "Failed to update project", description: err?.response?.data?.error });
    },
  });
};
