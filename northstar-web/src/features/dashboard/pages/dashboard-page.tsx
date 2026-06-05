import { CreateEmployeeDialog } from "@/features/employees/components/create-employee-dialog";
import { useEmployees } from "@/features/employees/hooks/use-employees";

export const DashboardPage = () => {
  const { data, isLoading, error } = useEmployees();

  if (isLoading) {
    return <p>Loading employees...</p>;
  }

  if (error) {
    return <p>Failed to load employees.</p>;
  }

  return (
    <div>
      <h1>Employees</h1>

      <CreateEmployeeDialog />

      {data?.map((employee) => (
        <div key={employee.id}>
          {employee.firstName} {employee.lastName}
        </div>
      ))}
    </div>
  );
};
