import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectTasks } from "../hooks/use-project-tasks";
import { useTaskSuggestions } from "../hooks/use-task-suggestions";
import { createTask, moveTask } from "../api/workspace.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "../api/workspace-query-keys";
import { Board } from "../components/board";
import { TaskDetail } from "../components/task-detail";
import type { Task, SuggestionType, TaskStatus } from "../types/workspace";
import { wipLimitFor } from "../types/workspace";

export const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const id = Number(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tasks, isLoading, error } = useProjectTasks(id);

  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);

  // Suggestions across all tasks, to badge cards. We fetch the selected task's
  // suggestions inside TaskDetail; for board badges we keep it lightweight.
  const { data: selectedSuggestions } = useTaskSuggestions(selected?.id ?? 0);

  const create = useMutation({
    mutationFn: () => createTask({ projectId: id, title }),
    onSuccess: () => {
      setTitle("");
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.projectTasks(id),
      });
    },
  });

  const move = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      moveTask(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.projectTasks(id),
      });
    },
  });

  const handleMove = (task: Task, status: TaskStatus) =>
    move.mutate({ taskId: task.id, status });

  if (isLoading) return <p>Loading board…</p>;
  if (error) return <p>Failed to load board.</p>;

  const boardSuggestions: { taskId: number; type: SuggestionType }[] = selected
    ? (selectedSuggestions ?? []).map((s) => ({ taskId: s.taskId, type: s.type }))
    : [];

  // Use the live task from the refetched board data so the side panel reflects
  // status changes (e.g. accept -> validated) immediately, instead of the stale
  // object captured when the card was clicked.
  const selectedTask = tasks?.find((t) => t.id === selected?.id) ?? selected;

  // Backlog WIP cap — disable "Add task" and show a hint when full. The board's
  // yellow n/cap badge stays; this is the form-side guard so the button can't
  // be clicked into a server 400.
  const backlogTasks = (tasks ?? []).filter((t) => t.status === "backlog");
  const backlogFull = backlogTasks.length >= wipLimitFor("backlog");

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => navigate("/workspace")}
      >
        <ChevronLeft />
        Projects
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Board</h1>
        <p className="text-sm text-muted-foreground">
          Server-authoritative task states. Illegal moves are rejected by the API.
        </p>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="task-title">New task</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </div>
        <Button
          disabled={!title || backlogFull || create.isPending}
          onClick={() => create.mutate()}
        >
          Add task
        </Button>
      </div>
      {backlogFull && (
        <p className="text-xs text-amber-500">
          Backlog is at its WIP limit ({wipLimitFor("backlog")}). Move or complete
          a task to add more.
        </p>
      )}

      <Board
        tasks={tasks ?? []}
        suggestions={boardSuggestions}
        onOpenTask={setSelected}
        onMoveTask={handleMove}
      />

      {selected && (
        <TaskDetail
          task={selectedTask ?? selected}
          projectId={id}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}
    </div>
  );
};
