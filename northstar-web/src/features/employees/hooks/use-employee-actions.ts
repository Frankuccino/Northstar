import { useState } from "react";
import type { Employee } from "../types/employee";

export const useEmployeeActions = () => {
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const onEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingEmployee(null);
  };

  return {
    editingEmployee,
    editOpen,
    onEdit,
    closeEdit,
  };
};
