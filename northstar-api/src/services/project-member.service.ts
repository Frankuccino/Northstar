import { eq, sql, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { projectMembers, users, tasks, invitations } from "../db/schema.js";

export interface ProjectMemberWithStats {
  userId: number;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
}

export const getProjectMembersWithStats = async (
  projectId: number,
): Promise<ProjectMemberWithStats[]> => {
  const members = await db
    .select({
      userId: projectMembers.userId,
      name: users.name,
      email: users.email,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(desc(projectMembers.joinedAt));

  // Get task stats for each member
  const stats = await Promise.all(
    members.map(async (member) => {
      const [taskStats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
          inProgress: sql<number>`count(*) filter (where ${tasks.status} in ('in_progress', 'needs_revision'))::int`,
        })
        .from(tasks)
        .where(eq(tasks.assigneeId, member.userId));

      return {
        ...member,
        totalTasks: taskStats?.total ?? 0,
        completedTasks: taskStats?.completed ?? 0,
        inProgressTasks: taskStats?.inProgress ?? 0,
      };
    }),
  );

  return stats;
};

export const getProjectInvitations = async (projectId: number) => {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      invitedByName: users.name,
    })
    .from(invitations)
    .leftJoin(users, eq(invitations.invitedById, users.id))
    .where(eq(invitations.projectId, projectId))
    .orderBy(desc(invitations.createdAt));
};
