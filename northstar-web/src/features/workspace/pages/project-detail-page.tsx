import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, Bot, Search } from "lucide-react";
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
import { createTask, moveTask, getAssignableUsers, getProject, searchTasks, getLabels, createLabel, deleteLabel } from "../api/workspace.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "../api/workspace-query-keys";
import { Board } from "../components/board";
import { TaskDetail } from "../components/task-detail";
import { DisintegrateItem } from "@/features/theme/disintegrate-item";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpdateProject } from "../hooks/use-update-project";
import { useUpdateTask } from "../hooks/use-update-task";
import { useDeleteTask } from "../hooks/use-delete-task";
import { useDeleteProject } from "../hooks/use-delete-project";
import { ProjectTeam } from "../components/project-team";
import { ConfirmDeleteDialog } from "../components/confirm-delete-dialog";
import { ConfirmDeleteTaskDialog } from "../components/confirm-delete-task-dialog";
import { AiChatPanel } from "../components/ai-chat-panel";
import { InvitationsManager } from "../components/invitations-manager";
import { useToast } from "@/features/theme/toast";
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

  const [selected, setSelected] = useState<Task | null>(null);
  const [disintegratingTaskIds, setDisintegratingTaskIds] = useState<Set<number>>(new Set());
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366f1");

  // Remember last visited workspace for sidebar navigation
  useEffect(() => {
    localStorage.setItem("northstar-last-workspace", String(id));
  }, [id]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await searchTasks(id, query);
      setSearchResults(results);
    } else {
      setSearchResults(null);
    }
  };
  const { toast } = useToast();
  const updateMutation = useUpdateProject();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const deleteProjectMutation = useDeleteProject();

  // Labels management
  const { data: projectLabels, refetch: refetchProjectLabels } = useQuery({
    queryKey: ["project-labels", id],
    queryFn: () => getLabels(id),
    enabled: settingsOpen,
  });

  const createLabelMut = useMutation({
    mutationFn: () => createLabel(id, { name: newLabelName, color: newLabelColor }),
    onSuccess: () => {
      setNewLabelName("");
      refetchProjectLabels();
    },
  });

  const deleteLabelMut = useMutation({
    mutationFn: (labelId: number) => deleteLabel(labelId),
    onSuccess: () => refetchProjectLabels(),
  });

  const { data: selectedSuggestions } = useTaskSuggestions(selected?.id ?? 0);

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const create = useMutation({
    mutationFn: () => createTask({
      projectId: id,
      title: newTaskTitle,
      priority: newTaskPriority,
      dueDate: newTaskDueDate ? `${newTaskDueDate}T00:00:00.000Z` : undefined,
    }),
    onSuccess: () => {
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setNewTaskDueDate("");
      setNewTaskOpen(false);
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(id, filters) });
      toast({ type: "success", title: "Task created" });
    },
    onError: (err: any) => {
      toast({ type: "error", title: "Failed to create task", description: err?.response?.data?.error });
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              className="w-fit gap-1"
              onClick={() => navigate("/workspace")}
            >
              <ChevronLeft className="h-4 w-4" />
              Projects
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setAiChatOpen(true)}
              >
                <Bot className="h-4 w-4" />
                <span className="hidden sm:inline">AI Chat</span>
              </Button>

              {canDeleteProject && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              )}
            </div>
          </div>

        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{project?.name ?? "Board"}</h1>
          {project?.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>

        {/* New Task Button */}
        <div className="flex justify-end">
          <Button
            disabled={backlogFull}
            onClick={() => setNewTaskOpen(true)}
          >
            + New task
          </Button>
        </div>
        {backlogFull && (
          <p className="text-xs text-amber-500 text-right">
            Backlog is at its WIP limit ({wipLimitFor("backlog")}). Move or complete a task to add more.
          </p>
        )}

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9"
          />
          {searchResults && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
              {searchResults.length > 0 ? (
                searchResults.map((task: any) => (
                  <div
                    key={task.id}
                    className="cursor-pointer p-2 text-sm hover:bg-muted"
                    onClick={() => {
                      setSelected(task as any);
                      setSearchQuery("");
                      setSearchResults(null);
                    }}
                  >
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {COLUMN_LABELS[task.status as TaskStatus]}
                    </p>
                  </div>
                ))
              ) : (
                <p className="p-2 text-sm text-muted-foreground">No tasks found</p>
              )}
            </div>
          )}
        </div>

        {/* Filters - right aligned on desktop */}
        <div className="flex flex-wrap items-end gap-2 sm:justify-end">
          <div className="w-36">
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

          <div className="w-44">
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
              onClick={clearFilters}
            >
              Clear
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
          disintegratingTaskIds={disintegratingTaskIds}
        />

        {selected && (
          <TaskDetail
            task={selectedTask ?? selected}
            projectId={id}
            open={!!selected}
            onOpenChange={(o) => !o && setSelected(null)}
            onDeleteRequest={(task) => {
              setSelected(null);
              setDeletingTask(task);
            }}
          />
        )}

        {/* Settings Sheet */}
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent className="flex w-full flex-col p-0 sm:w-[480px]">
            <SheetHeader className="px-4 pb-2 pt-4">
              <SheetTitle className="pr-8">Project Settings</SheetTitle>
            </SheetHeader>

            {project && (
              <div className="flex-1 overflow-y-auto px-4">
                <div className="space-y-4 py-3">
                  {/* Edit form */}
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
                          onSuccess: () => setSettingsOpen(false),
                        },
                      );
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-name" className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        id="edit-name"
                        name="name"
                        defaultValue={project.name}
                        placeholder="Project name"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-description" className="text-xs text-muted-foreground">Description</Label>
                      <Input
                        id="edit-description"
                        name="description"
                        defaultValue={project.description ?? ""}
                        placeholder="Optional"
                      />
                    </div>
                    {updateMutation.isError && (
                      <p className="text-sm text-red-600">
                        {(updateMutation.error as any)?.response?.data?.error ?? "Failed to update project."}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)} disabled={updateMutation.isPending}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>

                  {/* Labels */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Labels</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {projectLabels?.map((label: any) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                          <button onClick={() => deleteLabelMut.mutate(label.id)} className="opacity-70 hover:opacity-100">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="Label name" className="flex-1" />
                      <Input type="color" value={newLabelColor} onChange={(e) => setNewLabelColor(e.target.value)} className="w-12 p-1" />
                      <Button size="sm" disabled={!newLabelName.trim() || createLabelMut.isPending} onClick={() => createLabelMut.mutate()}>
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Team */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Team</h4>
                    <ProjectTeam project={project} />
                  </div>

                  {/* Invitations */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Invitations</h4>
                    <InvitationsManager projectId={id} />
                  </div>
                </div>

                {/* Danger zone */}
                <div className="space-y-2 border-t border-border py-4">
                  <h4 className="text-xs font-medium text-muted-foreground">Danger zone</h4>
                  <p className="text-xs text-muted-foreground">
                    Deleting a project removes it and all associated tasks permanently.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setSettingsOpen(false);
                      setDeletingProject({ id: project.id, name: project.name });
                    }}
                  >
                    Delete Project
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
      </DisintegrateItem>

      {deletingTask && (
        <ConfirmDeleteTaskDialog
          task={deletingTask}
          onOpenChange={(open) => {
            if (!open) setDeletingTask(null);
          }}
          onConfirm={() => {
            setDisintegratingTaskIds((prev) => {
              const next = new Set(prev);
              next.add(deletingTask.id);
              return next;
            });
            // Immediately delete - disintegration is just visual
            deleteTaskMutation.mutate(deletingTask.id, {
              onSuccess: () => {
                setDisintegratingTaskIds((prev) => {
                  const next = new Set(prev);
                  next.delete(deletingTask.id);
                  return next;
                });
                queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(id, filters) });
              },
            });
          }}
        />
      )}

      {/* New Task Dialog */}
      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (newTaskTitle.trim()) create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-task-title">Title</Label>
              <Input
                id="new-task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
                required
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label>Priority</Label>
                <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as "low" | "medium" | "high" | "urgent")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewTaskOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newTaskTitle.trim() || create.isPending}>
                {create.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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

      <AiChatPanel
        open={aiChatOpen}
        onOpenChange={setAiChatOpen}
        onTasksChanged={() => {
          queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(id, filters) });
        }}
      />
    </>
  );
};
