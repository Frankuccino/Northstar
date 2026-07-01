import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";

import type { Employee } from "../types/employee";
import { getEmployeeColumns } from "../components/employee-columns";

type Params = {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
};

const COLUMN_VISIBILITY_STORAGE_KEY = "employees-column-visibility";

export const useEmployeesTable = ({ employees, onEdit, onDelete }: Params) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);

    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(
      COLUMN_VISIBILITY_STORAGE_KEY,
      JSON.stringify(columnVisibility),
    );
  }, [columnVisibility]);

  const table = useReactTable({
    data: employees,
    columns: getEmployeeColumns({ onEdit, onDelete }),

    globalFilterFn: "includesString",

    state: {
      sorting,
      globalFilter,
      pagination,
      rowSelection,
      columnVisibility,
    },

    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return {
    table,
    globalFilter,
    setGlobalFilter,
  };
};
