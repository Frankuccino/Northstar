import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, X, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMyInvitations, revokeInvitation } from "../api/workspace.api";
import { useToast } from "@/features/theme/toast";

type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export const InvitationsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | "all">("all");

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: () => getMyInvitations(),
  });

  const revokeMut = useMutation({
    mutationFn: ({ invitationId, projectId }: { invitationId: number; projectId: number }) => revokeInvitation(projectId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
      toast({ type: "success", title: "Invitation revoked" });
    },
    onError: (err: any) => {
      toast({ type: "error", title: "Failed to revoke", description: err?.response?.data?.error });
    },
  });

  const filteredInvitations =
    invitations?.filter((inv: any) =>
      statusFilter === "all" ? true : inv.status === statusFilter
    ) ?? [];

  const pendingCount = invitations?.filter((i: any) => i.status === "pending").length ?? 0;
  const acceptedCount = invitations?.filter((i: any) => i.status === "accepted").length ?? 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "accepted":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "revoked":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "expired":
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "accepted":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "revoked":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "expired":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invitations</h1>
        <p className="text-sm text-muted-foreground">
          Manage invitations sent to team members across your projects.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-semibold">{pendingCount}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Accepted</p>
          <p className="text-2xl font-semibold">{acceptedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as InvitationStatus | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invitations list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invitations...</p>
      ) : filteredInvitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Mail className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No invitations found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInvitations.map((inv: any) => (
            <div
              key={inv.id}
              className="flex items-center gap-4 rounded-lg border bg-card p-4"
            >
              {getStatusIcon(inv.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusStyle(inv.status)}`}
                  >
                    {inv.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {inv.projectName} · Invited by {inv.invitedByName ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inv.status === "pending"
                    ? `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`
                    : inv.status === "accepted"
                    ? `Accepted ${inv.acceptedAt ? new Date(inv.acceptedAt).toLocaleDateString() : ""}`
                    : `Sent ${new Date(inv.createdAt).toLocaleDateString()}`}
                </p>
              </div>
              {inv.status === "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeMut.mutate({ invitationId: inv.id, projectId: inv.projectId })}
                  disabled={revokeMut.isPending}
                >
                  <X className="h-4 w-4" />
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
