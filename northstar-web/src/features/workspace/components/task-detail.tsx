import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useTaskSuggestions } from "../hooks/use-task-suggestions";
import { useCurrentUser } from "../../auth/hooks/use-current-user";
import {
  validateSuggestion,
  generateSuggestion,
  approveCommit,
  markValidated,
  getAssignableUsers,
  assignTask,
  createInvitation,
  getLabels,
  getTaskLabels,
  addLabelToTask,
  removeLabelFromTask,
  getTaskComments,
  createTaskComment,
  deleteTaskComment,
  updateTaskPriority,
  updateTaskDueDate,
} from "../api/workspace.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceKeys } from "../api/workspace-query-keys";
import {
  COLUMN_LABELS,
  type Task,
  type SuggestionType,
} from "../types/workspace";

const SUGGESTION_LABEL: Record<SuggestionType, string> = {
  context: "Context",
  approach: "Approach",
  checklist: "Checklist",
  draft: "Draft",
  commit_guidance: "Commit guidance",
};

interface TaskDetailProps {
  task: Task;
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteRequest?: (task: Task) => void;
}

export const TaskDetail = ({
  task,
  projectId,
  open,
  onOpenChange,
  onDeleteRequest,
}: TaskDetailProps) => {
  const queryClient = useQueryClient();
  const { data: suggestions, isLoading } = useTaskSuggestions(task.id);

  const [reason, setReason] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [commitJustification, setCommitJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: workspaceKeys.projectTasks(projectId),
    });
    queryClient.invalidateQueries({
      queryKey: workspaceKeys.taskSuggestions(task.id),
    });
  };

  const validate = useMutation({
    mutationFn: (input: { suggestionId: number; decision: "accept" | "reject" | "edit" }) =>
      validateSuggestion(task.id, { ...input, reason: reason || undefined }),
    onSuccess: () => {
      setReason("");
      invalidate();
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Validation failed"),
  });

  const generate = useMutation({
    mutationFn: (type: SuggestionType) => generateSuggestion(task.id, { type }),
    onSuccess: () => invalidate(),
    onError: (e: any) => setError(e?.response?.data?.error ?? "Generation failed"),
  });

  const commit = useMutation({
    mutationFn: () =>
      approveCommit(task.id, {
        message: commitMessage,
        justification: commitJustification,
      }),
    onSuccess: () => {
      setCommitMessage("");
      setCommitJustification("");
      invalidate();
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Commit failed"),
  });

  const markValidatedMut = useMutation({
    mutationFn: () => markValidated(task.id),
    onSuccess: () => invalidate(),
    onError: (e: any) => setError(e?.response?.data?.error ?? "Mark validated failed"),
  });

  const currentUser = useCurrentUser();
  const canDelete = currentUser?.role === "admin" || currentUser?.role === "manager";

  // ---- Assignee picker -----------------------------------------------------
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: workspaceKeys.assignableUsers(projectId),
    queryFn: () => getAssignableUsers(projectId),
    enabled: open,
  });

  const assignMut = useMutation({
    mutationFn: (assigneeId: number | null) => assignTask(task.id, assigneeId),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.error ?? "Failed to update assignee"),
  });

  const clearAssignee = () => assignMut.mutate(null);
  const setAssignee = (id: number) => assignMut.mutate(id);

  const [inviteEmail, setInviteEmail] = useState("");
  const inviteMut = useMutation({
    mutationFn: () => createInvitation(projectId, inviteEmail),
    onSuccess: () => {
      setInviteEmail("");
      setError(null);
    },
    onError: (e: any) =>
      setError(e?.response?.data?.error ?? "Failed to send invitation"),
  });

  const [localPriority, setLocalPriority] = useState(task.priority);
  const [localDueDate, setLocalDueDate] = useState(task.dueDate);

  // Sync local state when task prop changes
  useEffect(() => {
    setLocalPriority(task.priority);
    setLocalDueDate(task.dueDate);
  }, [task.priority, task.dueDate]);

  // ---- Priority -----------------------------------------------------------
  const priorityMut = useMutation({
    mutationFn: (priority: string) => updateTaskPriority(task.id, priority),
    onSuccess: () => {
      setLocalPriority(task.priority);
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(projectId) });
    },
  });

  // ---- Due Date -----------------------------------------------------------
  const dueDateMut = useMutation({
    mutationFn: (dueDate: string | null) => updateTaskDueDate(task.id, dueDate),
    onSuccess: () => {
      setLocalDueDate(task.dueDate);
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(projectId) });
    },
  });

  // ---- Labels -------------------------------------------------------------
  const { data: projectLabels } = useQuery({
    queryKey: ["project-labels", projectId],
    queryFn: () => getLabels(projectId),
    enabled: open,
  });

  const { data: taskLabels, refetch: refetchLabels } = useQuery({
    queryKey: ["task-labels", task.id],
    queryFn: () => getTaskLabels(task.id),
    enabled: open,
  });

  const addLabelMut = useMutation({
    mutationFn: (labelId: number) => addLabelToTask(task.id, labelId),
    onSuccess: () => refetchLabels(),
  });

  const removeLabelMut = useMutation({
    mutationFn: (labelId: number) => removeLabelFromTask(task.id, labelId),
    onSuccess: () => refetchLabels(),
  });

  // ---- Comments -----------------------------------------------------------
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["task-comments", task.id],
    queryFn: () => getTaskComments(task.id),
    enabled: open,
  });

  const addCommentMut = useMutation({
    mutationFn: (content: string) => createTaskComment(task.id, content),
    onSuccess: () => {
      setCommentText("");
      refetchComments();
    },
  });

  const deleteCommentMut = useMutation({
    mutationFn: (commentId: number) => deleteTaskComment(commentId),
    onSuccess: () => refetchComments(),
  });

  const unassignedOption: { id: string; name: string } = { id: "", name: "Unassigned" };
  const userOptions: { id: string; name: string }[] = (users ?? []).map((u) => ({
    id: String(u.id),
    name: u.name,
  }));
  const allOptions = [unassignedOption, ...userOptions];

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Status: {COLUMN_LABELS[task.status]}
          </p>

          {/* Priority & Due Date */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select
                value={localPriority}
                onValueChange={(v) => {
                  setLocalPriority(v as any);
                  priorityMut.mutate(v as string);
                }}
              >
                <SelectTrigger className="w-full">
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
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <Input
                type="date"
                value={localDueDate ? localDueDate.split("T")[0] : ""}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setLocalDueDate(val);
                  dueDateMut.mutate(val);
                }}
                className={isOverdue ? "border-red-500" : ""}
              />
              {isOverdue && (
                <p className="mt-1 text-xs text-red-500">Overdue</p>
              )}
            </div>
          </div>

          {/* Labels */}
          <section className="border-t pt-3">
            <h4 className="mb-2 text-sm font-semibold">Labels</h4>
            <div className="flex flex-wrap gap-2">
              {taskLabels?.map((label: any) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                  <button
                    onClick={() => removeLabelMut.mutate(label.id)}
                    className="ml-1 opacity-70 hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              ))}
              {projectLabels
                ?.filter(
                  (pl: any) => !taskLabels?.some((tl: any) => tl.id === pl.id)
                )
                .map((label: any) => (
                  <button
                    key={label.id}
                    onClick={() => addLabelMut.mutate(label.id)}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs opacity-60 hover:opacity-100"
                    style={{ borderColor: label.color, color: label.color }}
                  >
                    + {label.name}
                  </button>
                ))}
            </div>
          </section>

          {/* AI Suggestions */}
          <section className="border-t pt-3">
            <h4 className="mb-2 text-sm font-semibold">AI suggestions</h4>
            <div className="flex max-h-[20vh] flex-col overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : suggestions && suggestions.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <li key={s.id} className="rounded-md border p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">
                          {SUGGESTION_LABEL[s.type]} (v{s.version})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.model ?? "stub"}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {s.content}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            validate.mutate({ suggestionId: s.id, decision: "accept" })
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!reason}
                          onClick={() =>
                            validate.mutate({ suggestionId: s.id, decision: "reject" })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No suggestions yet.</p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["context", "approach", "checklist", "draft", "commit_guidance"] as SuggestionType[]).map(
                (type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant="secondary"
                    disabled={generate.isPending}
                    onClick={() => generate.mutate(type)}
                  >
                    Generate {SUGGESTION_LABEL[type]}
                  </Button>
                ),
              )}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <Label htmlFor="reason">Validation reason (optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why accept / reject / edit?"
            />
          </section>

          {/* ---- Assignee picker ------------------------------------------------- */}
          <section className="border-t pt-3">
            <h4 className="mb-2 text-sm font-semibold">Assignee</h4>
            {usersLoading && users === undefined ? (
              <p className="text-sm text-muted-foreground">Loading assignees…</p>
            ) : (
              <Select
                value={String(task.assigneeId ?? "")}
                onValueChange={(v) => {
                  if (v === "") clearAssignee();
                  else setAssignee(Number(v));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick an assignee" />
                </SelectTrigger>
                <SelectContent>
                  {allOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="mt-3 flex flex-col gap-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Invite by email"
                type="email"
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={!inviteEmail || inviteMut.isPending}
                onClick={() => inviteMut.mutate()}
              >
                Send invitation
              </Button>
            </div>
          </section>

          {/* ---- Comments ------------------------------------------------------- */}
          <section className="border-t pt-3">
            <h4 className="mb-2 text-sm font-semibold">Comments</h4>
            <div className="mb-3 flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && commentText.trim()) {
                    addCommentMut.mutate(commentText.trim());
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!commentText.trim() || addCommentMut.isPending}
                onClick={() => addCommentMut.mutate(commentText.trim())}
              >
                Post
              </Button>
            </div>
            <div className="space-y-2">
              {comments?.map((comment: any) => (
                <div key={comment.id} className="rounded-md border p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{comment.authorName}</span>
                    <button
                      onClick={() => deleteCommentMut.mutate(comment.id)}
                      className="text-xs text-muted-foreground hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="mt-1 text-sm">{comment.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t pt-3">
            <h4 className="mb-2 text-sm font-semibold">Approve commit</h4>
            {task.status !== "validated" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Accept a suggestion, or fast-forward the task to validated to
                  approve the commit.
                </p>
                <Button
                  variant="secondary"
                  disabled={markValidatedMut.isPending}
                  onClick={() => markValidatedMut.mutate()}
                >
                  Mark validated
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="feat: ..."
                />
                <Input
                  value={commitJustification}
                  onChange={(e) => setCommitJustification(e.target.value)}
                  placeholder="Justification"
                />
                <Button
                  disabled={!commitMessage || !commitJustification || commit.isPending}
                  onClick={() => commit.mutate()}
                >
                  Approve & mark done
                </Button>
              </div>
            )}
          </section>

          {canDelete && (
            <section className="border-t pt-3">
              <Button
                variant="destructive"
                onClick={() => onDeleteRequest?.(task)}
              >
                Delete task
              </Button>
            </section>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
