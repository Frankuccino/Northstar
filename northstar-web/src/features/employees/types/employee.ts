import type { UpdateEmployeeInput } from "./employee.types";

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
}

export interface UpdateEmployeeParams {
  id: number;
  data: UpdateEmployeeInput;
}
