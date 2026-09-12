import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteTask } from "../hooks/use-delete-task";
import type { Task } from "../types/workspace";

type ConfirmDeleteTaskDialogProps = {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
};

export const ConfirmDeleteTaskDialog = ({
  task,
  onOpenChange,
  onConfirm,
}: ConfirmDeleteTaskDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const deleteMutation = useDeleteTask();

  if (!task) {
    return null;
  }

  const canDelete = confirmText === task.title;

  const handleClose = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={!!task} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {task.title}
            </span>
            ? This action cannot be undone.
          </p>

          <div className="space-y-2">
            <label
              htmlFor="confirm-delete-task"
              className="text-sm font-medium leading-none"
            >
              Type &quot;{task.title}&quot; to confirm
            </label>
            <Input
              id="confirm-delete-task"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Task title"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!canDelete) return;
                handleClose();
                onConfirm?.();
              }}
              disabled={!canDelete || deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
