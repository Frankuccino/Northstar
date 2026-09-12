import { useQuery } from "@tanstack/react-query";
import { getProjectMembers } from "../api/workspace.api";
import type { Project } from "../types/workspace";

interface ProjectTeamProps {
  project: Project;
}

interface Member {
  userId: number;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
}

export const ProjectTeam = ({ project }: ProjectTeamProps) => {
  const { data: members, isLoading } = useQuery({
    queryKey: ["project-members", project.id],
    queryFn: () => getProjectMembers(project.id),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading team...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Team Members</h3>
        <p className="text-sm text-muted-foreground">
          {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-2">
        {members?.map((member) => (
          <MemberCard key={member.userId} member={member} />
        ))}
      </div>
    </div>
  );
};

const MemberCard = ({ member }: { member: Member }) => {
  const completionRate = member.totalTasks > 0
    ? Math.round((member.completedTasks / member.totalTasks) * 100)
    : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
        {member.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium truncate">{member.name}</p>
          <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span>{member.totalTasks} tasks</span>
          <span>{member.completedTasks} done</span>
          <span>{member.inProgressTasks} active</span>
        </div>
        {member.totalTasks > 0 && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
