import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useProjectTasks } from "../hooks/use-project-tasks";
import { useTaskSuggestions } from "../hooks/use-task-suggestions";
import { useCurrentUser } from "../../auth/hooks/use-current-user";
import { createTask, moveTask, getAssignableUsers, getProject } from "../api/workspace.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "../api/workspace-query-keys";
import { Board } from "../components/board";
import { TaskDetail } from "../components/task-detail";
import { DisintegrateItem } from "@/features/theme/disintegrate-item";
import { useUpdateProject } from "../hooks/use-update-project";
import { useUpdateTask } from "../hooks/use-update-task";
import { useDeleteTask } from "../hooks/use-delete-task";
import { useDeleteProject } from "../hooks/use-delete-project";
import { ProjectTeam } from "../components/project-team";
import { ConfirmDeleteDialog } from "../components/confirm-delete-dialog";
import type { Task, SuggestionType, TaskStatus } from "../types/workspace";
import { wipLimitFor, BOARD_COLUMNS, COLUMN_LABELS } from "../types/workspace";

export const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const id = Number(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const canDeleteProject = currentUser?.role === "admin";

  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState<number | "">("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [disintegratingProject, setDisintegratingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const filters = {
    ...(statusFilter ? { status: statusFilter as TaskStatus } : {}),
    ...(assigneeFilter !== "" ? { assigneeId: assigneeFilter as number } : {}),
  };
  const { data: tasks, isLoading, error } = useProjectTasks(id, filters);
  const { data: project } = useQuery({
    queryKey: workspaceKeys.project(id),
    queryFn: () => getProject(id),
    enabled: id > 0,
  });

  const { data: assignableUsers } = useQuery({
    queryKey: workspaceKeys.assignableUsers(id),
    queryFn: () => getAssignableUsers(id),
    enabled: id > 0,
  });

  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);
  const [disintegratingTaskId, setDisintegratingTaskId] = useState<number | null>(null);
  const updateMutation = useUpdateProject();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const deleteProjectMutation = useDeleteProject();

  const { data: selectedSuggestions } = useTaskSuggestions(selected?.id ?? 0);

  const create = useMutation({
    mutationFn: () => createTask({ projectId: id, title }),
    onSuccess: () => {
      setTitle("");
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.projectTasks(id, filters),
      });
    },
  });

  const move = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      moveTask(taskId, status),
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: workspaceKeys.projectTasks(id, filters) });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(workspaceKeys.projectTasks(id, filters));

      // Optimistically update the task's status
      queryClient.setQueryData<Task[]>(workspaceKeys.projectTasks(id, filters), (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, status } : t))
      );

      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      // Roll back on error
      if (context?.previousTasks) {
        queryClient.setQueryData(workspaceKeys.projectTasks(id, filters), context.previousTasks);
      }
    },
    onSuccess: () => {
      // No need to invalidate - optimistic update already applied
    },
  });

  const handleMove = (task: Task, status: TaskStatus) =>
    move.mutate({ taskId: task.id, status });

  const clearFilters = () => {
    setStatusFilter("");
    setAssigneeFilter("");
  };
  const hasFilters = statusFilter !== "" || assigneeFilter !== "";

  if (isLoading) return <p>Loading board…</p>;
  if (error) return <p>Failed to load board.</p>;

  const boardSuggestions: { taskId: number; type: SuggestionType }[] = selected
    ? (selectedSuggestions ?? []).map((s) => ({ taskId: s.taskId, type: s.type }))
    : [];

  const selectedTask = tasks?.find((t) => t.id === selected?.id) ?? selected;

  const backlogTasks = (tasks ?? []).filter((t) => t.status === "backlog");
  const backlogFull = backlogTasks.length >= wipLimitFor("backlog");

  return (
    <>
      <DisintegrateItem
        active={disintegratingProject}
        onComplete={() => {
          setDisintegratingProject(false);
          deleteProjectMutation.mutate(id, {
            onSuccess: () => navigate("/workspace"),
          });
        }}
      >
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => navigate("/workspace")}
          >
            <ChevronLeft />
            Projects
          </Button>

          {canDeleteProject && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold">{project?.name ?? "Board"}</h1>
          {project?.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
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

        <div className="flex flex-wrap items-center gap-4">
          <div className="w-44 space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as TaskStatus)}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {BOARD_COLUMNS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {COLUMN_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-56 space-y-2">
            <Label htmlFor="assignee-filter">Assignee</Label>
            <Select
              value={assigneeFilter === "" ? "unassigned" : String(assigneeFilter)}
              onValueChange={(v) =>
                setAssigneeFilter(v === "unassigned" ? "" : Number(v))
              }
            >
              <SelectTrigger id="assignee-filter">
                <SelectValue placeholder="All assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">All assignees</SelectItem>
                {(assignableUsers ?? []).map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="self-end"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>

        <Board
          tasks={tasks ?? []}
          suggestions={boardSuggestions}
          onOpenTask={setSelected}
          onMoveTask={handleMove}
          onUpdateTask={(task, title) =>
            updateTaskMutation.mutate({ id: task.id, data: { title } })
          }
          disintegratingTaskId={disintegratingTaskId}
          onDisintegrateComplete={(taskId) => {
            setDisintegratingTaskId(null);
            deleteTaskMutation.mutate(taskId, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(id, filters) });
              },
            });
          }}
        />

        {selected && (
          <TaskDetail
            task={selectedTask ?? selected}
            projectId={id}
            open={!!selected}
            onOpenChange={(o) => !o && setSelected(null)}
            onDeleteRequest={(task) => {
              setSelected(null);
              setDisintegratingTaskId(task.id);
            }}
          />
        )}

        {/* Settings Sheet */}
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Project Settings</SheetTitle>
              <div className="text-sm text-muted-foreground">
                Edit project details or delete this project.
              </div>
            </SheetHeader>

            {project && (
              <div className="space-y-6">
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updateMutation.mutate(
                      {
                        id: project.id,
                        data: {
                          name: String(formData.get("name") ?? ""),
                          description: String(formData.get("description") ?? ""),
                        },
                      },
                      {
                        onSuccess: () => {
                          setSettingsOpen(false);
                        },
                      },
                    );
                  }}
                >
                  <div className="space-y-1">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      defaultValue={project.name}
                      placeholder="Project name"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-description">Description</Label>
                    <Input
                      id="edit-description"
                      name="description"
                      defaultValue={project.description ?? ""}
                      placeholder="Optional"
                    />
                  </div>

                  {updateMutation.isError && (
                    <p className="text-sm text-red-600">
                      {(updateMutation.error as any)?.response?.data?.error ??
                        "Failed to update project."}
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSettingsOpen(false)}
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>

                <div className="space-y-2 border-t pt-4">
                  <h3 className="text-sm font-medium">Danger zone</h3>
                  <p className="text-sm text-muted-foreground">
                    Deleting a project removes it and all associated tasks
                    permanently.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setSettingsOpen(false);
                      setDeletingProject({ id: project.id, name: project.name });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete project
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <ProjectTeam project={project} />
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
      </DisintegrateItem>

      {deletingProject && (
        <ConfirmDeleteDialog
          project={{
            id: deletingProject.id,
            name: deletingProject.name,
            description: null,
            createdAt: "",
            updatedAt: "",
          }}
          totalTasks={tasks?.length ?? 0}
          totalAssignees={
            new Set(
              tasks?.map((t) => t.assigneeId).filter((id) => id != null) ?? [],
            ).size
          }
          onOpenChange={(open) => {
            if (!open) setDeletingProject(null);
          }}
          onConfirm={() => {
            setDisintegratingProject(true);
          }}
        />
      )}
    </>
  );
};
