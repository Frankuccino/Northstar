import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, Users, LayoutGrid } from "lucide-react";
import type { Project } from "../types/workspace";

type ConfirmDeleteDialogProps = {
  project: Project | null;
  totalTasks?: number;
  totalAssignees?: number;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
};

export const ConfirmDeleteDialog = ({
  project,
  totalTasks = 0,
  totalAssignees = 0,
  onOpenChange,
  onConfirm,
}: ConfirmDeleteDialogProps) => {
  const [confirmText, setConfirmText] = useState("");

  if (!project) {
    return null;
  }

  const canDelete = confirmText === project.name;

  const handleClose = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={!!project} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {project.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Folder className="h-8 w-8 text-muted-foreground" />
          </div>

          <h3 className="text-center text-xl font-semibold">{project.name}</h3>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <LayoutGrid className="h-4 w-4" />
              <span>{totalTasks} cards</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{totalAssignees} assignees</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To confirm, type &quot;{project.name}&quot; in the box below
          </p>

          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Project name"
          />

          <div className="flex justify-end">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                if (!canDelete) return;
                handleClose();
                onConfirm?.();
              }}
              disabled={!canDelete}
            >
              Delete this project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
