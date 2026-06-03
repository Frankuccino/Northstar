import { getEmployees } from "../api/employees.api";
import { useQuery } from "@tanstack/react-query";

export const useEmployees = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });
};
