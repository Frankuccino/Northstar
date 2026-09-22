import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/features/theme/theme-context";
import { type Task, type SuggestionType } from "../types/workspace";

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

const getPriorityStyle = (
  priority: string,
  theme: {
    colors: {
      primary: string;
      foreground: string;
      accent: string;
      accentForeground: string;
      destructive: string;
      muted: string;
      mutedForeground: string;
    };
  },
): React.CSSProperties => {
  switch (priority) {
    case "low":
      return {
        background: `color-mix(in oklch, ${theme.colors.muted} 25%, transparent)`,
        color: theme.colors.mutedForeground,
        borderColor: `color-mix(in oklch, ${theme.colors.mutedForeground} 20%, transparent)`,
      };
    case "medium":
      return {
        background: `color-mix(in oklch, ${theme.colors.primary} 20%, transparent)`,
        color: `color-mix(in oklch, ${theme.colors.primary} 85%, ${theme.colors.foreground} 15%)`,
        borderColor: `color-mix(in oklch, ${theme.colors.primary} 30%, transparent)`,
      };
    case "high":
      return {
        background: `color-mix(in oklch, ${theme.colors.accent} 30%, transparent)`,
        color: theme.colors.accentForeground,
        borderColor: `color-mix(in oklch, ${theme.colors.accent} 45%, transparent)`,
      };
    case "urgent":
      return {
        background: `color-mix(in oklch, ${theme.colors.destructive} 18%, transparent)`,
        color: `color-mix(in oklch, ${theme.colors.destructive} 80%, ${theme.colors.foreground} 20%)`,
        borderColor: `color-mix(in oklch, ${theme.colors.destructive} 30%, transparent)`,
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

export const TaskCard = ({
  task,
  suggestionTypes,
  onOpen,
  onUpdate,
}: TaskCardProps) => {
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
      className="group/card flex h-28 cursor-pointer flex-col justify-between p-3.5 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 min-w-0 text-sm font-medium leading-snug">
            {task.title}
          </p>
          <span
            className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
            style={priorityStyle}
          >
            {PRIORITY_LABELS[task.priority] ?? "Med"}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {task.assigneeName ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary ring-1 ring-primary/20">
              {initials(task.assigneeName)}
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-1 ring-border">
              ?
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {formattedDate && (
            <span
              className={cn(
                "font-medium",
                isOverdue ? "text-red-500" : "text-muted-foreground",
              )}
            >
              {formattedDate}
            </span>
          )}
          {(task.commentCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {task.commentCount}
            </span>
          )}
        </div>
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
