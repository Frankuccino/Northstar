import { employeeKeys } from "../api/employee-query-keys";
import { getEmployees } from "../api/employees.api";
import { useQuery } from "@tanstack/react-query";

export const useEmployees = () => {
  return useQuery({
    queryKey: employeeKeys.all,
    queryFn: getEmployees,
  });
};
