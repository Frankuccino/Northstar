import { api } from "@/lib/axios";

import type { Employee } from "../types/employee";

export const getEmployees = async (): Promise<Employee[]> => {
  const response = await api("/employees");

  return response.data;
};
