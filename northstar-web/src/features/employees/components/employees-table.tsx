import type { Employee } from "../types/employee";

import { DataTable } from "@/components/ui/data-table";
import { useEmployeesTable } from "../hooks/use-employees-table";

type EmployeesTableProps = {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
};

export const EmployeesTable = ({
  employees,
  onEdit,
  onDelete,
}: EmployeesTableProps) => {
  const table = useEmployeesTable({ employees, onEdit, onDelete });
  return <DataTable table={table} />;
};
