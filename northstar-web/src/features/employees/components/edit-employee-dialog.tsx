import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Employee } from "../types/employee";
import type { UpdateEmployeeInput } from "../types/employee.types";
import { EmployeeForm } from "./employee-form";
import { useUpdateEmployee } from "../hooks/use-update-employee";

type EditEmployeeDialogProps = {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
};

export const EditEmployeeDialog = ({
  open,
  employee,
  onClose,
}: EditEmployeeDialogProps) => {
  const updateEmployeeMutation = useUpdateEmployee();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>
        {employee && (
          <EmployeeForm
            key={employee.id}
            defaultValues={employee}
            submitLabel="Save Changes"
            onSubmit={(data) =>
              updateEmployeeMutation.mutate(
                {
                  id: employee.id,
                  data: data as UpdateEmployeeInput,
                },
                {
                  onSuccess: onClose,
                },
              )
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
