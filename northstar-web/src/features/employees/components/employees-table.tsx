import { DataTable } from "@/components/ui/data-table";
import type { Table } from "@tanstack/react-table";
import type { Employee } from "../types/employee";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

type EmployeesTableProps = {
  table: Table<Employee>;
};

export const EmployeesTable = ({ table }: EmployeesTableProps) => {
  return (
    <>
      <DataTable table={table} />
      <DataTablePagination table={table} />
    </>
  );
};
