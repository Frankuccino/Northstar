import type { ColumnDef } from "@tanstack/react-table";
import type { Employee } from "../types/employee";
import { EmployeeRowActions } from "./employee-row-actions";

type Props = {
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
};

export const getEmployeeColumns = ({
  onEdit,
  onDelete,
}: Props): ColumnDef<Employee>[] => [
  {
    accessorKey: "firstName",
    header: "First Name",
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "position",
    header: "Position",
  },
  {
    accessorKey: "department",
    header: "Department",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <EmployeeRowActions
        employee={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
