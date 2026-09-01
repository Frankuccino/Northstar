import { useState } from "react";
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
  deleteTask,
  getAssignableUsers,
  assignTask,
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
}

export const TaskDetail = ({
  task,
  projectId,
  open,
  onOpenChange,
}: TaskDetailProps) => {
  const queryClient = useQueryClient();
  const { data: suggestions, isLoading } = useTaskSuggestions(task.id);

  const [reason, setReason] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [commitJustification, setCommitJustification] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const del = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      invalidate();
      onOpenChange(false);
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Delete failed"),
  });

  // ---- Assignee picker -----------------------------------------------------
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: workspaceKeys.assignableUsers(),
    queryFn: getAssignableUsers,
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

  const unassignedOption: { id: string; name: string } = { id: "", name: "Unassigned" };
  const userOptions: { id: string; name: string }[] = (users ?? []).map((u) => ({
    id: String(u.id),
    name: u.name,
  }));
  const allOptions = [unassignedOption, ...userOptions];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
        </SheetHeader>

        <p className="text-sm text-muted-foreground">
          Status: {COLUMN_LABELS[task.status]}
        </p>

        <section className="flex h-[55vh] flex-col">
          <h4 className="mb-2 text-sm font-semibold">AI suggestions</h4>
          <div className="flex-1 overflow-y-auto pr-1">
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
              disabled={del.isPending}
              onClick={() => del.mutate()}
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
      </SheetContent>
    </Sheet>
  );
};
