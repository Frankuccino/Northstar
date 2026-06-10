import { CreateEmployeeDialog } from "@/features/employees/components/create-employee-dialog";
import { EmployeesTable } from "@/features/employees/components/employees-table";
import { EditEmployeeDialog } from "@/features/employees/components/edit-employee-dialog";
import { ConfirmDeleteDialog } from "@/features/employees/components/confirm-delete-dialog";
import { useEmployeeActions } from "@/features/employees/hooks/use-employee-actions";
import { useEmployees } from "@/features/employees/hooks/use-employees";

export const DashboardPage = () => {
  const { data, isLoading, error } = useEmployees();
  const {
    editingEmployee,
    editOpen,
    onEdit,
    closeEdit,
    deletingEmployee,
    setDeletingEmployee,
  } = useEmployeeActions();

  if (isLoading) {
    return <p>Loading employees...</p>;
  }

  if (error) {
    return <p>Failed to load employees.</p>;
  }

  return (
    <div>
      <h1>Employees</h1>

      <CreateEmployeeDialog />

      <EmployeesTable
        employees={data ?? []}
        onEdit={onEdit}
        onDelete={(employee) => setDeletingEmployee(employee)}
      />

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
