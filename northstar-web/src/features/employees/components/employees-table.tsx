import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Employee } from "../types/employee";

type EmployeesTableProps = {
  employees: Employee[];
};

export const EmployeesTable = ({ employees }: EmployeesTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>First Name</TableHead>
          <TableHead>Last Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Position</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {employees?.map(({ id, firstName, lastName, email, position }) => (
          <TableRow key={id}>
            <TableCell>{firstName}</TableCell>
            <TableCell>{lastName}</TableCell>
            <TableCell>{email}</TableCell>
            <TableCell>{position}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
