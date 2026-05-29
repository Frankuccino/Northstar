export const employeeKeys = {
  all: ["employees"] as const,
  detail: (id: number) => ["employees", id] as const,
};
