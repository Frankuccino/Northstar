import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, UserPlus, X, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProjectInvitations, createInvitation, revokeInvitation } from "../api/workspace.api";
import { useToast } from "@/features/theme/toast";

interface InvitationsManagerProps {
  projectId: number;
}

export const InvitationsManager = ({ projectId }: InvitationsManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["project-invitations", projectId],
    queryFn: () => getProjectInvitations(projectId),
  });

  const createMut = useMutation({
    mutationFn: (email: string) => createInvitation(projectId, email),
    onSuccess: () => {
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["project-invitations", projectId] });
      toast({ type: "success", title: "Invitation sent" });
    },
    onError: (err: any) => {
      toast({ type: "error", title: "Failed to send invitation", description: err?.response?.data?.error });
    },
  });

  const revokeMut = useMutation({
    mutationFn: (invitationId: number) => revokeInvitation(projectId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-invitations", projectId] });
      toast({ type: "success", title: "Invitation revoked" });
    },
    onError: (err: any) => {
      toast({ type: "error", title: "Failed to revoke", description: err?.response?.data?.error });
    },
  });

  const pendingInvitations = invitations?.filter((i) => i.status === "pending") ?? [];
  const acceptedInvitations = invitations?.filter((i) => i.status === "accepted") ?? [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    createMut.mutate(email.trim());
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Invitations</h3>
        <p className="text-sm text-muted-foreground">Invite team members to this project</p>
      </div>

      {/* Send invite form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          disabled={createMut.isPending}
        />
        <Button type="submit" disabled={!email.trim() || createMut.isPending} size="sm">
          <UserPlus className="h-4 w-4" />
        </Button>
      </form>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Pending ({pendingInvitations.length})</p>
          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 rounded-lg border p-2">
              <Mail className="h-4 w-4 shrink-0 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{inv.email}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => revokeMut.mutate(inv.id)}
                disabled={revokeMut.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Accepted invitations */}
      {acceptedInvitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Accepted ({acceptedInvitations.length})</p>
          {acceptedInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{inv.email}</p>
                <p className="text-xs text-muted-foreground">
                  Invited by {inv.invitedByName ?? "Unknown"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading invitations...</p>
      )}

      {!isLoading && invitations?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No invitations yet</p>
      )}
    </div>
  );
};
