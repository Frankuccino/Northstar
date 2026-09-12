import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";
import { useToast } from "@/features/theme/toast";

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; description?: string | null } }) =>
      updateTask(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(workspaceKeys.projectTasks(data.projectId), (old: any) =>
        old?.map((t: any) => (t.id === data.id ? { ...t, ...data } : t))
      );
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(data.projectId) });
      toast({ type: "success", title: "Task updated" });
    },
    onError: (err: any) => {
      toast({ type: "error", title: "Failed to update task", description: err?.response?.data?.error });
    },
  });
};
