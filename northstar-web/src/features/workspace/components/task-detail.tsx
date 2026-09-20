import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

type TabId = "details" | "comments" | "ai";

interface TaskDetailProps {
  task: Task;
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteRequest?: (task: Task) => void;
}

function getDueDateDisplay(dueDate: string | null): { label: string; tone: "normal" | "warning" | "overdue" } | null {
  if (!dueDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, tone: "overdue" };
  }
  if (diffDays === 0) {
    return { label: "Due today", tone: "warning" };
  }
  if (diffDays === 1) {
    return { label: "1d left", tone: "normal" };
  }
  return { label: `${diffDays}d left`, tone: "normal" };
}

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
);

function getDaysBetween(from: string, to: string): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(0, 0, 0, 0);
  return Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("details");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(projectId) });
    queryClient.invalidateQueries({ queryKey: workspaceKeys.taskSuggestions(task.id) });
  };

  const validate = useMutation({
    mutationFn: (input: { suggestionId: number; decision: "accept" | "reject" | "edit" }) =>
      validateSuggestion(task.id, { ...input, reason: reason || undefined }),
    onSuccess: () => { setReason(""); invalidate(); },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Validation failed"),
  });

  const generate = useMutation({
    mutationFn: (type: SuggestionType) => generateSuggestion(task.id, { type }),
    onSuccess: () => invalidate(),
    onError: (e: any) => setError(e?.response?.data?.error ?? "Generation failed"),
  });

  const commit = useMutation({
    mutationFn: () => approveCommit(task.id, { message: commitMessage, justification: commitJustification }),
    onSuccess: () => { setCommitMessage(""); setCommitJustification(""); invalidate(); },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Commit failed"),
  });

  const markValidatedMut = useMutation({
    mutationFn: () => markValidated(task.id),
    onSuccess: () => invalidate(),
    onError: (e: any) => setError(e?.response?.data?.error ?? "Mark validated failed"),
  });

  const inviteMut = useMutation({
    mutationFn: () => createInvitation(projectId, inviteEmail),
    onSuccess: () => { setInviteEmail(""); setError(null); },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to send invitation"),
  });

  const currentUser = useCurrentUser();
  const canDelete = currentUser?.role === "admin" || currentUser?.role === "manager";

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: workspaceKeys.assignableUsers(projectId),
    queryFn: () => getAssignableUsers(projectId),
    enabled: open,
  });

  const assignMut = useMutation({
    mutationFn: (assigneeId: number | null) => assignTask(task.id, assigneeId),
    onSuccess: () => { invalidate(); setError(null); },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to update assignee"),
  });

  const clearAssignee = () => assignMut.mutate(null);
  const setAssignee = (id: number) => assignMut.mutate(id);

  const [localPriority, setLocalPriority] = useState(task.priority);
  const [localDueDate, setLocalDueDate] = useState(task.dueDate);

  useEffect(() => {
    setLocalPriority(task.priority);
    setLocalDueDate(task.dueDate);
  }, [task.priority, task.dueDate]);

  const priorityMut = useMutation({
    mutationFn: (priority: string) => updateTaskPriority(task.id, priority),
    onSuccess: () => {
      setLocalPriority(task.priority);
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(projectId) });
    },
  });

  const dueDateMut = useMutation({
    mutationFn: (dueDate: string | null) => updateTaskDueDate(task.id, dueDate),
    onSuccess: () => {
      setLocalDueDate(task.dueDate);
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projectTasks(projectId) });
    },
  });

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

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["task-comments", task.id],
    queryFn: () => getTaskComments(task.id),
    enabled: open,
  });

  const addCommentMut = useMutation({
    mutationFn: (content: string) => createTaskComment(task.id, content),
    onSuccess: () => { setCommentText(""); refetchComments(); },
  });

  const unassignedOption: { id: string; name: string } = { id: "", name: "Unassigned" };
  const userOptions: { id: string; name: string }[] = (users ?? []).map((u) => ({
    id: String(u.id),
    name: u.name,
  }));
  const allOptions = [unassignedOption, ...userOptions];

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const dueDateDisplay = getDueDateDisplay(task.dueDate);

  const tabClass = (id: TabId) =>
    `px-3 py-2 text-sm font-medium transition-colors ${
      activeTab === id
        ? "border-b-2 border-primary text-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:w-[480px]">
        <SheetHeader className="px-4 pb-3 pt-4">
          <SheetTitle className="pr-8">{task.title}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
              {COLUMN_LABELS[task.status]}
            </span>
            {dueDateDisplay && (
              <span className={`font-medium ${
                dueDateDisplay.tone === "overdue" ? "text-red-500" :
                dueDateDisplay.tone === "warning" ? "text-amber-500" :
                ""
              }`}>{dueDateDisplay.label}</span>
            )}
            {task.assigneeName && (
              <span>{task.assigneeName}</span>
            )}
            <span className="ml-auto flex items-center gap-2">
              <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
              {task.dueDate && (
                <span>· {getDaysBetween(task.createdAt, task.dueDate)}d</span>
              )}
            </span>
          </div>
        </SheetHeader>

        {/* Tab bar */}
        <div className="flex shrink-0 gap-1 px-4">
          <button onClick={() => setActiveTab("details")} className={tabClass("details")}>
            Details
          </button>
          <button onClick={() => setActiveTab("comments")} className={tabClass("comments")}>
            Comments {comments?.length ? <span className="ml-1 text-xs text-muted-foreground">({comments.length})</span> : ""}
          </button>
          <button onClick={() => setActiveTab("ai")} className={tabClass("ai")}>
            AI {suggestions?.length ? <span className="ml-1 text-xs text-muted-foreground">({suggestions.length})</span> : ""}
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4">
          {/* ==================== Details Tab ==================== */}
          {activeTab === "details" && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select
                    value={localPriority}
                    onValueChange={(v) => {
                      setLocalPriority(v as any);
                      priorityMut.mutate(v as string);
                    }}
                  >
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
                <div className="space-y-1.5">
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
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Assignee</Label>
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
                      <SelectValue placeholder="Unassigned" />
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Invite teammate</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    type="email"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!inviteEmail || inviteMut.isPending}
                    onClick={() => inviteMut.mutate()}
                  >
                    Invite
                  </Button>
                </div>
                <Hint>Send an email invitation to join this project.</Hint>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Labels</Label>
                <div className="flex flex-wrap gap-1.5">
                  {taskLabels?.map((label: any) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                      <button
                        onClick={() => removeLabelMut.mutate(label.id)}
                        className="opacity-70 hover:opacity-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {projectLabels
                    ?.filter((pl: any) => !taskLabels?.some((tl: any) => tl.id === pl.id))
                    .map((label: any) => (
                      <button
                        key={label.id}
                        onClick={() => addLabelMut.mutate(label.id)}
                        className="rounded-full border px-2 py-0.5 text-xs opacity-60 hover:opacity-100"
                        style={{ borderColor: label.color, color: label.color }}
                      >
                        + {label.name}
                      </button>
                    ))}
                </div>
              </div>

              {task.status !== "validated" && (
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={markValidatedMut.isPending}
                    onClick={() => markValidatedMut.mutate()}
                  >
                    Mark Validated
                  </Button>
                  <Hint>
                    Mark this task as validated to enable commit approval. This signals the task is ready for final review.
                  </Hint>
                </div>
              )}

              {task.status === "validated" && (
                <div className="space-y-3 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                  <h4 className="text-sm font-semibold">Approve Commit</h4>
                  <Hint>Finalize this task with a commit message.</Hint>
                  <Input
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message"
                  />
                  <Input
                    value={commitJustification}
                    onChange={(e) => setCommitJustification(e.target.value)}
                    placeholder="Justification (optional)"
                  />
                  <Button
                    size="sm"
                    disabled={!commitMessage.trim() || commit.isPending}
                    onClick={() => commit.mutate()}
                  >
                    {commit.isPending ? "Committing..." : "Commit"}
                  </Button>
                </div>
              )}

              {/* Danger zone */}
              {canDelete && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h4 className="text-xs font-medium text-muted-foreground">Danger zone</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteRequest?.(task)}
                  >
                    Delete Task
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ==================== Comments Tab ==================== */}
          {activeTab === "comments" && (
            <div className="flex h-full flex-col py-3">
              <div className="shrink-0 space-y-3 pb-3">
                <div className="flex gap-2">
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
              </div>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
                {comments?.map((comment: any) => (
                  <div key={comment.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{comment.authorName}</span>
                      <span className="text-xs text-muted-foreground/60">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">{comment.content}</p>
                  </div>
                ))}
                {comments?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ==================== AI Tab ==================== */}
          {activeTab === "ai" && (
            <div className="flex h-full flex-col py-3">
              <div className="shrink-0 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {(["context", "approach", "checklist", "draft", "commit_guidance"] as SuggestionType[]).map(
                    (type) => (
                      <Button
                        key={type}
                        size="xs"
                        variant="outline"
                        disabled={generate.isPending}
                        onClick={() => generate.mutate(type)}
                      >
                        {SUGGESTION_LABEL[type]}
                      </Button>
                    ),
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : suggestions && suggestions.length > 0 ? (
                  suggestions.map((s) => (
                    <div key={s.id} className="rounded-md border p-3 text-sm">
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
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            validate.mutate({ suggestionId: s.id, decision: "accept" })
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={!reason}
                          onClick={() =>
                            validate.mutate({ suggestionId: s.id, decision: "reject" })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No suggestions yet. Generate one above.</p>
                )}
              </div>
              <div className="shrink-0 space-y-1.5 pt-3">
                <Label htmlFor="reason" className="text-xs text-muted-foreground">
                  Validation reason (optional)
                </Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why accept / reject?"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="absolute bottom-4 left-4 right-4 rounded-md bg-red-50 p-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
};
