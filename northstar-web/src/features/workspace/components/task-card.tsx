import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/features/theme/theme-context";
import {
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

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_SEMANTIC: Record<string, "primary" | "muted" | "warning" | "danger"> = {
  low: "primary",
  medium: "muted",
  high: "warning",
  urgent: "danger",
};

const getPriorityStyle = (
  priority: string,
  theme: {
    colors: {
      primary: string;
      muted: string;
      mutedForeground: string;
      border: string;
    };
  },
): React.CSSProperties => {
  const semantic = PRIORITY_SEMANTIC[priority] ?? "muted";
  switch (semantic) {
    case "primary":
      return {
        background: `color-mix(in oklch, ${theme.colors.muted} 5%, transparent)`,
        color: theme.colors.primary,
        borderColor: `color-mix(in oklch, ${theme.colors.border} 40%, transparent)`,
      };
    case "muted":
      return {
        background: theme.colors.muted,
        color: theme.colors.mutedForeground,
        borderColor: `color-mix(in oklch, ${theme.colors.mutedForeground} 15%, transparent)`,
      };
    case "warning":
      return {
        background: `color-mix(in oklch, oklch(0.92 0.04 80) 15%, transparent)`,
        color: `oklch(0.65 0.15 70)`,
        borderColor: `color-mix(in oklch, oklch(0.85 0.08 80) 30%, transparent)`,
      };
    case "danger":
      return {
        background: `color-mix(in oklch, oklch(0.95 0.05 25) 12%, transparent)`,
        color: `oklch(0.6 0.18 25)`,
        borderColor: `color-mix(in oklch, oklch(0.88 0.08 25) 30%, transparent)`,
      };
    default:
      return {
        background: theme.colors.muted,
        color: theme.colors.mutedForeground,
        borderColor: `color-mix(in oklch, ${theme.colors.mutedForeground} 15%, transparent)`,
      };
  }
};

// "Jane Doe" -> "JD"; "jane" -> "JA" (fallback to first 2 chars).
const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

interface TaskCardProps {
  task: Task;
  suggestionTypes: SuggestionType[];
  onOpen: (task: Task) => void;
  onUpdate?: (task: Task, title: string) => void;
}

export const TaskCard = ({ task, suggestionTypes, onOpen, onUpdate }: TaskCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const { theme } = useTheme();

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate?.(task, editTitle.trim());
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const formattedDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  const priorityStyle = getPriorityStyle(task.priority, theme);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => !isEditing && onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="group cursor-pointer p-3 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          className="h-7 text-sm"
        />
      ) : (
        <p className="text-sm font-medium leading-snug">{task.title}</p>
      )}

      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
        <span
          className="rounded-full border px-1.5 py-0.5 font-medium"
          style={priorityStyle}
        >
          {PRIORITY_LABELS[task.priority] ?? "Med"}
        </span>

        {task.assigneeName && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
            {initials(task.assigneeName)}
          </span>
        )}

        {formattedDate && (
          <span
            className={cn(
              "ml-auto font-medium",
              isOverdue ? "text-red-500" : "text-muted-foreground"
            )}
          >
            {formattedDate}
          </span>
        )}
      </div>

      {suggestionTypes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {suggestionTypes.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {SUGGESTION_BADGE[t]}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
};
