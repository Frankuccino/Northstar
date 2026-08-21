import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TaskCard } from "./task-card";
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
  legalNextStatuses,
  wipLimitFor,
  type Task,
  type SuggestionType,
  type TaskStatus,
} from "../types/workspace";

interface BoardColumnProps {
  status: TaskStatus;
  tasks: Task[];
  suggestionByTask: Map<number, SuggestionType[]>;
  onOpenTask: (task: Task) => void;
  // While a card is being dragged, only legal drop targets should accept it.
  // `allowedTargets` is null when no drag is in progress (all columns normal).
  allowedTargets: Set<TaskStatus> | null;
}

const BoardColumn = ({
  status,
  tasks,
  suggestionByTask,
  onOpenTask,
  allowedTargets,
}: BoardColumnProps) => {
  // A column is a valid drop zone during a drag only if it's the active card's
  // current column or one of its legal next states. When not dragging,
  // `allowedTargets` is null and every column is enabled.
  const isAllowed =
    allowedTargets === null || allowedTargets.has(status);

  // WIP cap (frontend mirror — server is authoritative). A full column is
  // greyed and non-droppable, consistent with the transition guardrail.
  const cap = wipLimitFor(status);
  const atCap = tasks.length >= cap;
  const isDroppable = isAllowed && !atCap;

  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: !isDroppable,
  });

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{COLUMN_LABELS[status]}</h3>
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
        className={`flex min-h-32 flex-col gap-2 p-2 transition-colors ${
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
}

const DraggableTaskCard = ({
  task,
  suggestionTypes,
  onOpen,
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
      <TaskCard
        task={task}
        suggestionTypes={suggestionTypes}
        onOpen={onOpen}
      />
    </div>
  );
};

interface BoardProps {
  tasks: Task[];
  suggestions: { taskId: number; type: SuggestionType }[];
  onOpenTask: (task: Task) => void;
  onMoveTask: (task: Task, status: TaskStatus) => void;
}

export const Board = ({
  tasks,
  suggestions,
  onOpenTask,
  onMoveTask,
}: BoardProps) => {
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Pointer-based collision: a drop only registers when the pointer is directly
  // inside a registered (enabled) droppable. Disabled (greyed/illegal) columns
  // are excluded, so hovering one can't fall back to a neighbouring column —
  // the card simply snaps back, instead of being misfiled into an adjacent lane.
  const collisionDetection: CollisionDetection = (args) => {
    const within = pointerWithin(args);
    if (within.length === 0) return within;
    // Only keep hits whose droppable is enabled. Disabled (greyed/illegal)
    // columns are dropped from the candidate set entirely, so the pointer can
    // never resolve a drop onto one — or onto a neighbour standing in for it.
    const enabled = args.droppableContainers.filter((c) => !c.disabled);
    return within.filter((hit) =>
      enabled.some((c) => c.id === hit.id),
    );
  };

  const suggestionByTask = new Map<number, SuggestionType[]>();
  for (const s of suggestions) {
    const list = suggestionByTask.get(s.taskId) ?? [];
    list.push(s.type);
    suggestionByTask.set(s.taskId, list);
  }

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const activeTask = activeId != null ? taskById.get(activeId) ?? null : null;

  // Legal drop targets for the card currently being dragged. Null = idle.
  const allowedTargets: Set<TaskStatus> | null =
    activeTask != null
      ? new Set<TaskStatus>([activeTask.status, ...legalNextStatuses(activeTask.status)])
      : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const target = over.id as TaskStatus;
    const moved = taskById.get(Number(active.id));
    // Defense in depth: the UI already disables illegal columns, but the server
    // is authoritative. `over` will only ever be a legal target here because
    // illegal columns are non-droppable; this guard still validates.
    if (!moved || !BOARD_COLUMNS.includes(target)) return;
    if (moved.status === target) return;
    onMoveTask(moved, target);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            suggestionByTask={suggestionByTask}
            onOpenTask={onOpenTask}
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
