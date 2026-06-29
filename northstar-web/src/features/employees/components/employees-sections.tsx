import { useEmployeeActions } from "../hooks/use-employee-actions";
import { useEmployees } from "../hooks/use-employees";
import { useEmployeesTable } from "../hooks/use-employees-table";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { CreateEmployeeDialog } from "./create-employee-dialog";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import { EmployeesTable } from "./employees-table";
import { EmployeesSearchbar } from "./employees-searchbar";
import { DataTablePagination } from "@/components/data-table-pagination";
import { DataTableColumnVisibility } from "@/components/data-table-column-visibility";

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
    <div className="flex flex-col gap-4 px-2 mx-2">
      {/* Toolbar: Grouping controls horizontally */}
      <div className="flex items-center justify-between">
        {/* Action Header */}
        <CreateEmployeeDialog />

        <div className="w-2xl">
          <EmployeesSearchbar
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
          />
        </div>
        <DataTableColumnVisibility table={table} />
      </div>
      {/* Table Area */}
      <div className="rounded-md border">
        <EmployeesTable table={table} />
      </div>

      {/* Pagination Area */}
      <DataTablePagination table={table} />

      {/* Dialogs remain outside the layout flow */}
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
