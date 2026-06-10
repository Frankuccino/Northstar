import { api } from "@/lib/axios";

import type { Employee, UpdateEmployeeParams } from "../types/employee";
import type { CreateEmployeeInput } from "../types/employee.types";

export const getEmployees = async (): Promise<Employee[]> => {
  const response = await api("/employees");

  return response.data;
};

export const createEmployee = async (
  data: CreateEmployeeInput,
): Promise<Employee> => {
  const response = await api.post("/employees", data);

  return response.data;
};

export const updateEmployee = async ({
  id,
  data,
}: UpdateEmployeeParams): Promise<Employee> => {
  const response = await api.patch(`/employees/${id}`, data);

  return response.data;
};
