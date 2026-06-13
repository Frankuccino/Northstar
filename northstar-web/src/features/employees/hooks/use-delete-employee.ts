import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { deleteEmployee } from "../api/employees.api";
import { employeeKeys } from "../api/employee-query-keys";
import { toast } from "sonner";

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success("Employee deleted successfully");
    },

    onError: () => {
      toast.error("Failed to delete employee");
    },
  });
};
