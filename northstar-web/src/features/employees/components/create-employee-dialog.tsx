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

export const CreateEmployeeDialog = () => {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateEmployee();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>Create Employee</Button>
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
          onSubmit={(data) =>
            createMutation.mutate(data, {
              onSuccess: () => setOpen(false),
            })
          }
        />
      </DialogContent>
    </Dialog>
  );
};
