import { queryClient } from "@/lib/query-client";
import { useMutation } from "@tanstack/react-query";
import { employeeKeys } from "../api/employee-query-keys";
import { updateEmployee } from "../api/employees.api";

export const useUpdateEmployee = () => {
  return useMutation({
    mutationFn: updateEmployee,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: employeeKeys.all,
      });
    },
  });
};
