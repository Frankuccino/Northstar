import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProject } from "../hooks/use-update-project";
import type { Project } from "../types/workspace";

type EditProjectDialogProps = {
  open: boolean;
  project: Project | null;
  onClose: () => void;
};

export const EditProjectDialog = ({
  open,
  project,
  onClose,
}: EditProjectDialogProps) => {
  const update = useUpdateProject();

  useEffect(() => {
    if (!open) {
      update.reset();
    }
  }, [open, update]);

  if (!project) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the name and description for this project.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            update.mutate(
              {
                id: project.id,
                data: {
                  name: String(formData.get("name") ?? ""),
                  description: String(formData.get("description") ?? ""),
                },
              },
              { onSuccess: onClose },
            );
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              name="name"
              defaultValue={project.name}
              placeholder="Project name"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              name="description"
              defaultValue={project.description ?? ""}
              placeholder="Optional"
            />
          </div>

          {update.isError && (
            <p className="text-sm text-red-600">
              {(update.error as any)?.response?.data?.error ??
                "Failed to update project."}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={update.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
