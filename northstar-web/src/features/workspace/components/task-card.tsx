import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

// "Jane Doe" -> "JD"; "jane" -> "JA" (fallback to first 2 chars).
const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 border-blue-300",
  medium: "bg-gray-100 text-gray-700 border-gray-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  urgent: "bg-red-100 text-red-700 border-red-300",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  urgent: "Urgent",
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

      <div className="mt-1.5 flex items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[10px] font-medium capitalize",
            PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium
          )}
        >
          {PRIORITY_LABELS[task.priority] ?? "Med"}
        </span>
        <span className="text-xs text-muted-foreground">
          {COLUMN_LABELS[task.status]}
        </span>
      </div>

      {task.assigneeName && (
        <p className="mt-1 text-xs font-medium text-foreground/70">
          {initials(task.assigneeName)}
          <span className="ml-1 text-muted-foreground">{task.assigneeName}</span>
        </p>
      )}

      {task.dueDate && (
        <p
          className={cn(
            "mt-1 text-xs",
            isOverdue ? "font-medium text-red-500" : "text-muted-foreground"
          )}
        >
          {isOverdue ? "⚠️ Overdue: " : "📅 "}
          {new Date(task.dueDate).toLocaleDateString()}
        </p>
      )}

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
