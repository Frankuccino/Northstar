import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { TaskCard } from "./task-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  BOARD_COLUMNS,
  COLUMN_LABELS,
  COLUMN_DESCRIPTIONS,
  legalNextStatuses,
  wipLimitFor,
  type Task,
  type SuggestionType,
  type TaskStatus,
} from "../types/workspace";
import { DisintegrateItem } from "@/features/theme/disintegrate-item";

interface BoardColumnProps {
  status: TaskStatus;
  tasks: Task[];
  suggestionByTask: Map<number, SuggestionType[]>;
  onOpenTask: (task: Task) => void;
  onUpdateTask?: (task: Task, title: string) => void;
  disintegratingTaskIds: Set<number>;
  // While a card is being dragged, only legal drop targets should accept it.
  // `allowedTargets` is null when no drag is in progress (all columns normal).
  allowedTargets: Set<TaskStatus> | null;
}

const BoardColumn = ({
  status,
  tasks,
  suggestionByTask,
  onOpenTask,
  onUpdateTask,
  disintegratingTaskIds,
  allowedTargets,
}: BoardColumnProps) => {
  const isAllowed = allowedTargets === null || allowedTargets.has(status);

  const cap = wipLimitFor(status);
  const atCap = tasks.length >= cap;
  const isDroppable = isAllowed && !atCap;

  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: !isDroppable,
  });

  return (
    <div className="flex w-56 shrink-0 flex-col gap-2 sm:w-64">
      <div className="flex items-center justify-between px-1">
        <Tooltip key="bottom">
          <TooltipTrigger className="text-sm font-semibold">
            {COLUMN_LABELS[status]}
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>{COLUMN_DESCRIPTIONS[status]}</span>
          </TooltipContent>
        </Tooltip>
        <span
          className={`text-xs ${
            atCap ? "font-semibold text-amber-500" : "text-muted-foreground"
          }`}
          title={`WIP cap ${cap}`}
        >
          {tasks.length}/{cap}
        </span>
      </div>
      <Card
        ref={setNodeRef}
        className={`flex min-h-32 flex-col gap-2 border bg-muted/30 p-2 transition-colors ${
          !isDroppable
            ? "opacity-40 grayscale"
            : isOver
              ? "ring-2 ring-primary/40"
              : ""
        }`}
      >
        {tasks.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
            No tasks
          </p>
        ) : (
          tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              suggestionTypes={suggestionByTask.get(task.id) ?? []}
              onOpen={onOpenTask}
              onUpdate={onUpdateTask}
              disintegrating={disintegratingTaskIds.has(task.id)}
            />
          ))
        )}
      </Card>
    </div>
  );
};

interface DraggableTaskCardProps {
  task: Task;
  suggestionTypes: SuggestionType[];
  onOpen: (task: Task) => void;
  onUpdate?: (task: Task, title: string) => void;
  disintegrating?: boolean;
}

const DraggableTaskCard = ({
  task,
  suggestionTypes,
  onOpen,
  onUpdate,
  disintegrating,
}: DraggableTaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-40" : ""}
    >
      <DisintegrateItem active={disintegrating ?? false}>
        <TaskCard
          task={task}
          suggestionTypes={suggestionTypes}
          onOpen={onOpen}
          onUpdate={onUpdate}
        />
      </DisintegrateItem>
    </div>
  );
};

interface BoardProps {
  tasks: Task[];
  suggestions: { taskId: number; type: SuggestionType }[];
  onOpenTask: (task: Task) => void;
  onMoveTask: (task: Task, status: TaskStatus) => void;
  onUpdateTask?: (task: Task, title: string) => void;
  disintegratingTaskIds: Set<number>;
}

export const Board = ({
  tasks,
  suggestions,
  onOpenTask,
  onMoveTask,
  onUpdateTask,
  disintegratingTaskIds,
}: BoardProps) => {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const displayTasks = localTasks ?? tasks;

  useEffect(() => {
    setLocalTasks(null);
  }, [tasks]);

  const collisionDetection: CollisionDetection = (args) => {
    const within = pointerWithin(args);
    if (within.length === 0) return within;
    const enabled = args.droppableContainers.filter((c) => !c.disabled);
    return within.filter((hit) => enabled.some((c) => c.id === hit.id));
  };

  const suggestionByTask = new Map<number, SuggestionType[]>();
  for (const s of suggestions) {
    const list = suggestionByTask.get(s.taskId) ?? [];
    list.push(s.type);
    suggestionByTask.set(s.taskId, list);
  }

  const taskById = new Map(displayTasks.map((t) => [t.id, t]));
  const activeTask = activeId != null ? (taskById.get(activeId) ?? null) : null;

  const allowedTargets: Set<TaskStatus> | null =
    activeTask != null
      ? new Set<TaskStatus>([
          activeTask.status,
          ...legalNextStatuses(activeTask.status),
        ])
      : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const target = over.id as TaskStatus;
    const moved = taskById.get(Number(active.id));
    if (!moved || !BOARD_COLUMNS.includes(target)) return;
    if (moved.status === target) return;

    setLocalTasks((prev) => {
      const base = prev ?? tasks;
      return base.map((t) =>
        t.id === moved.id ? { ...t, status: target } : t,
      );
    });

    onMoveTask(moved, target);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 sm:gap-4">
        {BOARD_COLUMNS.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={displayTasks.filter((t) => t.status === status)}
            suggestionByTask={suggestionByTask}
            onOpenTask={onOpenTask}
            onUpdateTask={onUpdateTask}
            disintegratingTaskIds={disintegratingTaskIds}
            allowedTargets={allowedTargets}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            suggestionTypes={suggestionByTask.get(activeTask.id) ?? []}
            onOpen={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
