import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmployeeForm } from "./employee-form";

import { useState } from "react";

export const CreateEmployeeDialog = () => {
  const [open, setOpen] = useState(false);

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

        <EmployeeForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
