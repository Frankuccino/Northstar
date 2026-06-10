import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { deleteEmployee } from "../api/employees.api";
import { employeeKeys } from "../api/employee-query-keys";

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
};
