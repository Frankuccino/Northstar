import type { Request, Response, NextFunction } from "express";
import { getProjectMembersWithStats, getProjectInvitations } from "../services/project-member.service.js";

export const getProjectMembersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = Number(req.params.id);
    const members = await getProjectMembersWithStats(projectId);
    res.json(members);
  } catch (err) {
    next(err);
  }
};

export const getProjectInvitationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = Number(req.params.id);
    const invitations = await getProjectInvitations(projectId);
    res.json(invitations);
  } catch (err) {
    next(err);
  }
};
