import { useMutation } from "@tanstack/react-query";

import { createEmployee } from "../api/employees.api";
import { queryClient } from "@/lib/query-client";
import { employeeKeys } from "../api/employee-query-keys";

export const useCreateEmployee = () => {
  return useMutation({
    mutationFn: createEmployee,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: employeeKeys.all,
      });
    },
  });
};
