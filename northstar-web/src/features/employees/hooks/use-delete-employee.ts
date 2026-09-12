import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { deleteEmployee } from "../api/employees.api";
import { employeeKeys } from "../api/employee-query-keys";
import { useToast } from "@/features/theme/toast";

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast({ type: "success", title: "Employee deleted" });
    },
    onError: () => {
      toast({ type: "error", title: "Failed to delete employee" });
    },
  });
};
