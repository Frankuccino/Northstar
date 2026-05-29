// Employee Service Layer (Database)
import { eq } from "drizzle-orm";
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

export const getById = async (id: number) => {
  const employee = await db.query.employees.findFirst({
    where: (employees, { eq }) => eq(employees.id, id),
  });

  return employee;
};

export const update = async (id: number, data: any) => {
  const [updated] = await db
    .update(employees)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id))
    .returning();

  return updated;
};

export const remove = async (id: number) => {
  const [deleted] = await db
    .delete(employees)
    .where(eq(employees.id, id))
    .returning();

  return deleted;
};
