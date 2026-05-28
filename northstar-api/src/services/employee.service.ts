// Employee Service Layer (Database)

import { db } from "../db/index.js";
import { employees } from "../db/schema.js";
import { CreateEmployeeDTO } from "../types/employee.types.js";

export const getAll = async () => {
  return db.select().from(employees);
};

export const create = async (data: CreateEmployeeDTO) => {
  const [employee] = await db.insert(employees).values(data).returning();

  return employee;
};
