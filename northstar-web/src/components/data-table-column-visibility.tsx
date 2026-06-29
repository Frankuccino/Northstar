import type { Table } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { SlidersHorizontal } from "lucide-react";

interface DataTableColumnVisibilityProps<TData> {
  table: Table<TData>;
}

export const DataTableColumnVisibility = <TData,>({
  table,
}: DataTableColumnVisibilityProps<TData>) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            <SlidersHorizontal className="h-4 w-4" />
            Columns
          </Button>
        }
      ></DropdownMenuTrigger>

      <DropdownMenuContent>
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
