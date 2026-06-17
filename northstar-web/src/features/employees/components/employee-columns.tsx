import type { ColumnDef } from "@tanstack/react-table";
import type { Employee } from "../types/employee";
import { EmployeeRowActions } from "./employee-row-actions";
import { SelectionCell, SelectionHeader } from "./selection-checkbox";

type Props = {
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
};

export const getEmployeeColumns = ({
  onEdit,
  onDelete,
}: Props): ColumnDef<Employee>[] => [
  {
    id: "select",
    header: ({ table }) => <SelectionHeader table={table} />,
    cell: ({ row }) => <SelectionCell row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "firstName",
    header: "First Name",
    enableSorting: true,
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    enableSorting: true,
  },
  {
    accessorKey: "position",
    header: "Position",
    enableSorting: true,
  },
  {
    accessorKey: "department",
    header: "Department",
    enableSorting: true,
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <EmployeeRowActions
        employee={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
