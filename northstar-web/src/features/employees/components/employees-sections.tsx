import { useEmployeeActions } from "../hooks/use-employee-actions";
import { useEmployees } from "../hooks/use-employees";
import { useEmployeesTable } from "../hooks/use-employees-table";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { CreateEmployeeDialog } from "./create-employee-dialog";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import { EmployeesTable } from "./employees-table";
import { EmployeesToolbar } from "./employees-toolbar";

export const EmployeesSection = () => {
  const { data, isLoading, error } = useEmployees();

  const {
    editingEmployee,
    editOpen,
    onEdit,
    closeEdit,
    deletingEmployee,
    setDeletingEmployee,
  } = useEmployeeActions();

  const { table, globalFilter, setGlobalFilter } = useEmployeesTable({
    employees: data ?? [],
    onEdit,
    onDelete: setDeletingEmployee,
  });

  if (isLoading) {
    return <p>Loading employees...</p>;
  }
  if (error) {
    return <p>Failed to load employees.</p>;
  }

  return (
    <div>
      <CreateEmployeeDialog />

      <EmployeesToolbar
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />

      <EmployeesTable table={table} />

      <EditEmployeeDialog
        open={editOpen}
        employee={editingEmployee}
        onClose={closeEdit}
      />

      <ConfirmDeleteDialog
        employee={deletingEmployee}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingEmployee(null);
          }
        }}
      />
    </div>
  );
};
