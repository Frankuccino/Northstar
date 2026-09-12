import { useMutation } from "@tanstack/react-query";

import { createEmployee } from "../api/employees.api";
import { queryClient } from "@/lib/query-client";
import { employeeKeys } from "../api/employee-query-keys";
import { useToast } from "@/features/theme/toast";

export const useCreateEmployee = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: createEmployee,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast({ type: "success", title: "Employee created" });
    },

    onError: () => {
      toast({ type: "error", title: "Failed to create employee" });
    },
  });
};
