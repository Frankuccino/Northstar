import { z } from "zod";
import { TASK_STATUSES } from "../types/task-status.js";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const createTaskSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.number().int().positive().optional(),
});

export const moveTaskSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export const generateSuggestionSchema = z.object({
  type: z.enum(["context", "approach", "checklist", "draft", "commit_guidance"]),
});

export const validateSuggestionSchema = z.object({
  suggestionId: z.number().int().positive(),
  decision: z.enum(["accept", "reject", "edit"]),
  reason: z.string().max(1000).optional(),
});

export const approveCommitSchema = z.object({
  message: z.string().min(1).max(200),
  justification: z.string().max(1000),
});
