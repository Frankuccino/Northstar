import { queryClient } from "@/lib/query-client";
import { useMutation } from "@tanstack/react-query";
import { employeeKeys } from "../api/employee-query-keys";
import { updateEmployee } from "../api/employees.api";
import { toast } from "sonner";

export const useUpdateEmployee = () => {
  return useMutation({
    mutationFn: updateEmployee,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success("Employees updated successfully");
    },

    onError: () => {
      toast.error("Failed to update employee");
    },
  });
};
