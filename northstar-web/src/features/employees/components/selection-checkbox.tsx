import { Checkbox } from "@/components/ui/checkbox";
import type { Row, Table } from "@tanstack/react-table";

// Header component for "Select All"
export const SelectionHeader = ({ table }: { table: Table<any> }) => (
  <Checkbox
    checked={table.getIsAllPageRowsSelected()}
    // If your version of Checkbox supports this:
    indeterminate={table.getIsSomePageRowsSelected()}
    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  />
);

// Cell component for individual row selection
export const SelectionCell = ({ row }: { row: Row<any> }) => (
  <Checkbox
    checked={row.getIsSelected()}
    onCheckedChange={(value) => row.toggleSelected(!!value)}
    aria-label="Select row"
  />
);
