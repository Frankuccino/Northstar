import { useReactTable, getCoreRowModel } from "@tanstack/react-table";

import type { Employee } from "../types/employee";
import { getEmployeeColumns } from "../components/employee-columns";

type Params = {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
};

export const useEmployeesTable = ({ employees, onEdit, onDelete }: Params) => {
  return useReactTable({
    data: employees,
    columns: getEmployeeColumns({ onEdit, onDelete }),
    getCoreRowModel: getCoreRowModel(),
  });
};
