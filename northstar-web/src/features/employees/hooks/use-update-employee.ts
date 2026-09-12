import { queryClient } from "@/lib/query-client";
import { useMutation } from "@tanstack/react-query";
import { employeeKeys } from "../api/employee-query-keys";
import { updateEmployee } from "../api/employees.api";
import { useToast } from "@/features/theme/toast";

export const useUpdateEmployee = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateEmployee,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast({ type: "success", title: "Employee updated" });
    },

    onError: () => {
      toast({ type: "error", title: "Failed to update employee" });
    },
  });
};
