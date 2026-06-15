import { Input } from "@/components/ui/input";

type Props = {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
};

export const EmployeesToolbar = ({
  globalFilter,
  onGlobalFilterChange,
}: Props) => {
  return (
    <div>
      <Input
        value={globalFilter ?? ""}
        onChange={(e) => onGlobalFilterChange(e.target.value)}
        placeholder="Search employees..."
      />
    </div>
  );
};
