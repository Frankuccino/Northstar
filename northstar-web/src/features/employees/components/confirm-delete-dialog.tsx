import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteEmployee } from "../hooks/use-delete-employee";
import type { Employee } from "../types/employee";

type ConfirmDeleteDialogProps = {
  employee: Employee | null;
  onOpenChange: (open: boolean) => void;
};

export const ConfirmDeleteDialog = ({
  employee,
  onOpenChange,
}: ConfirmDeleteDialogProps) => {
  const deleteMutation = useDeleteEmployee();

  if (!employee) {
    return null;
  }

  return (
    <Dialog open={!!employee} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Employee</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {employee.firstName}{" "}
            {employee.lastName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              deleteMutation.mutate(employee.id, {
                onSuccess: () => onOpenChange(false),
              })
            }
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
