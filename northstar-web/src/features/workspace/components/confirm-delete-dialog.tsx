import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteProject } from "../hooks/use-delete-project";
import type { Project } from "../types/workspace";

type ConfirmDeleteDialogProps = {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
};

export const ConfirmDeleteDialog = ({
  project,
  onOpenChange,
}: ConfirmDeleteDialogProps) => {
  const deleteMutation = useDeleteProject();

  if (!project) {
    return null;
  }

  return (
    <Dialog open={!!project} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {project.name}? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              deleteMutation.mutate(project.id, {
                onSuccess: () => onOpenChange(false),
              })
            }
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
