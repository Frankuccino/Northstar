import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createEmployeeSchema } from "../schemas/employee.schema";
import type { CreateEmployeeInput } from "../types/employee.types";
import { useCreateEmployee } from "../hooks/use-create-employee";

type EmployeeFormProps = {
  onSuccess: () => void;
};

export const EmployeeForm = ({ onSuccess }: EmployeeFormProps) => {
  const createEmployeeMutation = useCreateEmployee();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      position: "",
      department: "",
    },
  });

  const onSubmit = async (data: CreateEmployeeInput) => {
    createEmployeeMutation.mutate(data);

    reset();
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>

          <Input id="firstName" placeholder="John" {...register("firstName")} />

          {errors.firstName && (
            <p className="text-sm text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>

          <Input id="lastName" placeholder="Doe" {...register("lastName")} />

          {errors.lastName && (
            <p className="text-sm text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>

        <Input
          id="email"
          type="email"
          placeholder="john.doe@northstar.com"
          {...register("email")}
        />

        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>

          <Input
            id="position"
            placeholder="Software Engineer"
            {...register("position")}
          />

          {errors.position && (
            <p className="text-sm text-destructive">
              {errors.position.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>

          <Input
            id="department"
            placeholder="Engineering"
            {...register("department")}
          />

          {errors.department && (
            <p className="text-sm text-destructive">
              {errors.department.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || createEmployeeMutation.isPending}
        >
          {isSubmitting ? "Creating Employee..." : "Create Employee"}
        </Button>
      </div>
    </form>
  );
};
