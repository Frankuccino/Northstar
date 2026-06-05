import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmployeeForm } from "./employee-form";

export const CreateEmployeeDialog = () => {
  return (
    <>
      <Dialog>
        <DialogTrigger>
          <Button>Create Employee</Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm />
        </DialogContent>
      </Dialog>
    </>
  );
};
