import { z } from "zod";
import { TASK_STATUSES } from "../types/task-status.js";
import { INVITATION_STATUSES } from "../db/schema.js";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.number().int().positive().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

// New schemas for task features
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const updatePrioritySchema = z.object({
  priority: z.enum(TASK_PRIORITIES),
});

export const updateDueDateSchema = z.object({
  dueDate: z.string().nullable().optional(),
});

export const createLabelSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const moveTaskSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export const assignTaskSchema = z.object({
  assigneeId: z.number().int().positive().nullable(),
});

export const generateSuggestionSchema = z.object({
  type: z.enum(["context", "approach", "checklist", "draft", "commit_guidance"]),
});

export const validateSuggestionSchema = z
  .object({
    suggestionId: z.number().int().positive(),
    decision: z.enum(["accept", "reject", "edit"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .superRefine((val, ctx) => {
    if (
      (val.decision === "reject" || val.decision === "edit") &&
      !val.reason
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message:
          "reason is required when rejecting or editing a suggestion",
      });
    }
  });

export const approveCommitSchema = z.object({
  message: z.string().trim().min(1).max(200),
  justification: z.string().trim().min(1).max(1000),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: z.coerce.number().int().positive().nullable().optional(),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email().max(255),
});

export const listInvitationsQuerySchema = z.object({
  statuses: z
    .enum(INVITATION_STATUSES)
    .array()
    .optional(),
});

export const executeAiIntentSchema = z.object({
  intent: z.enum([
    "list_tasks",
    "get_task",
    "create_task",
    "move_task",
    "assign_task",
    "list_invitations",
    "create_invitation",
  ]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const listAiActionsQuerySchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
});
