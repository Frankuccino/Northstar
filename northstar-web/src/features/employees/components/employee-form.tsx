import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createEmployeeSchema } from "../schemas/employee.schema";
import type { CreateEmployeeInput } from "../types/employee.types";

export const EmployeeForm = () => {
  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      position: "",
      department: "",
    },
  });

  const onSubmit = (data: CreateEmployeeInput) => {
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="firstName">First Name</Label>
        <Input {...form.register("firstName")} id="firstName" />
      </div>
      <div>
        <Label htmlFor="lastName">Last Name</Label>
        <Input {...form.register("lastName")} id="lastName" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input {...form.register("email")} id="email" />
      </div>
      <div>
        <Label htmlFor="position">Position</Label>
        <Input {...form.register("position")} id="position" />
      </div>
      <div>
        <Label htmlFor="department">Department</Label>
        <Input {...form.register("department")} id="department" />
      </div>

      <Button type="submit">Create Employee</Button>
    </form>
  );
};
