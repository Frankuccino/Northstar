import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  COLUMN_LABELS,
  type Task,
  type SuggestionType,
} from "../types/workspace";

const SUGGESTION_BADGE: Record<SuggestionType, string> = {
  context: "Context",
  approach: "Approach",
  checklist: "Checklist",
  draft: "Draft",
  commit_guidance: "Commit",
};

interface TaskCardProps {
  task: Task;
  suggestionTypes: SuggestionType[];
  onOpen: (task: Task) => void;
}

export const TaskCard = ({ task, suggestionTypes, onOpen }: TaskCardProps) => {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task);
        }
      }}
      className="cursor-pointer p-3 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {COLUMN_LABELS[task.status]}
      </p>

      {suggestionTypes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {suggestionTypes.map((t) => (
            <span
              key={t}
              className={cn(
                "rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground",
              )}
            >
              {SUGGESTION_BADGE[t]}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
};
