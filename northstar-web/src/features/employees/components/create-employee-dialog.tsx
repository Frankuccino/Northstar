import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmployeeForm } from "./employee-form";
import { useCreateEmployee } from "../hooks/use-create-employee";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CreateEmployeeInput } from "../types/employee.types";

export const CreateEmployeeDialog = () => {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateEmployee();

  const handleCreateEmployee = (data: CreateEmployeeInput) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Create Employee</Button>}>
        Create Employee
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Employee</DialogTitle>
          <DialogDescription>
            Add a new employee to the organization.
          </DialogDescription>
        </DialogHeader>

        <EmployeeForm
          submitLabel="Create Employee"
          onSubmit={handleCreateEmployee}
        />
      </DialogContent>
    </Dialog>
  );
};
