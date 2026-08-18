import type { Request, Response, NextFunction } from "express";
import {
  createProject,
  createTask,
  getProjects,
  getProject,
  getTasksByProject,
  moveTask,
  generateSuggestion,
  getLatestSuggestions,
  validateSuggestion,
  approveCommit,
} from "../services/workspace.service.js";

export const createProjectHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, description } = req.body;
    const project = await createProject(name, description);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
};

export const listProjectsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json(await getProjects());
  } catch (err) {
    next(err);
  }
};

export const getProjectHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json(await getProject(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
};

export const createTaskHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { projectId, title, description, assigneeId } = req.body;
    const task = await createTask(projectId, title, description, assigneeId);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

export const listTasksHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json(await getTasksByProject(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
};

export const moveTaskHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await moveTask(Number(req.params.id), req.body.status);
    res.json(task);
  } catch (err) {
    next(err);
  }
};

export const generateSuggestionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const suggestion = await generateSuggestion(
      Number(req.params.id),
      req.body.type,
    );
    res.status(201).json(suggestion);
  } catch (err) {
    next(err);
  }
};

export const listSuggestionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json(await getLatestSuggestions(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
};

export const validateSuggestionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { suggestionId, decision, reason } = req.body;
    const actorId = req.user!.id;
    const validation = await validateSuggestion(
      Number(req.params.id),
      suggestionId,
      decision,
      actorId,
      reason,
    );
    res.status(201).json(validation);
  } catch (err) {
    next(err);
  }
};

export const approveCommitHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { message, justification } = req.body;
    const approvedBy = req.user!.id;
    const record = await approveCommit(
      Number(req.params.id),
      message,
      justification,
      approvedBy,
    );
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
};
