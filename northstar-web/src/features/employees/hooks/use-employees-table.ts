import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

import type { Employee } from "../types/employee";
import { getEmployeeColumns } from "../components/employee-columns";

type Params = {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
};

export const useEmployeesTable = ({ employees, onEdit, onDelete }: Params) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data: employees,
    columns: getEmployeeColumns({ onEdit, onDelete }),

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),

    globalFilterFn: "includesString",

    state: {
      sorting,
      globalFilter,
    },

    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });

  return {
    table,
    globalFilter,
    setGlobalFilter,
  };
};
