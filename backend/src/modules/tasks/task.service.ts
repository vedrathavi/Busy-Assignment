import { HistoryType, NotificationType, UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/app-error';
import { AuthUser } from '../auth/auth.types';
import { taskPolicy } from './task.policy';
import { taskRepository } from './task.repository';
import {
  CompleteTaskInput,
  CreateTaskInput,
  TaskListQuery,
  TaskListResponse,
  TaskResponse,
  UpdateTaskInput,
} from './task.types';

export class TaskService {
  /**
   * Creates a new Task for a deal inside an atomic transaction with assignment notifications for all assignees.
   */
  async createTask(user: AuthUser, dealId: string, input: CreateTaskInput): Promise<TaskResponse> {
    const deal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        teamId: user.teamId,
        deletedAt: null,
      },
      select: {
        id: true,
        teamId: true,
        ownerId: true,
        title: true,
        collaborators: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    if (!taskPolicy.canCreate(user, deal)) {
      throw new ForbiddenError('You do not have permission to create tasks for this deal');
    }

    const assignedToIds = input.assignedToIds && input.assignedToIds.length > 0
      ? input.assignedToIds
      : input.assignedToId
      ? [input.assignedToId]
      : [];

    if (assignedToIds.length === 0) {
      throw new BadRequestError('At least one assignee is required');
    }

    // Validate each target assignee
    for (const assigneeId of assignedToIds) {
      const targetUser = await prisma.user.findFirst({
        where: {
          id: assigneeId,
          teamId: user.teamId,
        },
        select: {
          id: true,
          role: true,
          teamId: true,
          name: true,
        },
      });

      if (!targetUser) {
        throw new BadRequestError(`Assignee ${assigneeId} does not exist or does not belong to your team`);
      }

      if (targetUser.role !== UserRole.SALES_REP) {
        throw new BadRequestError('Task assignees must be Sales Reps');
      }

      if (!taskPolicy.canAssign(user, deal, targetUser)) {
        throw new ForbiddenError('One or more selected assignees are not associated with this deal.');
      }
    }

    // Task creation with nested assignees is atomic in Prisma
    const task = await taskRepository.create({
      title: input.title,
      description: input.description,
      priority: input.priority,
      assignedToIds,
      dueDate: input.dueDate,
      teamId: user.teamId,
      dealId: deal.id,
      createdById: user.id,
    });

    // Create TASK_ASSIGNED notifications for all assignees (except self-assignment)
    const notificationAssigneeIds = assignedToIds.filter((id) => id !== user.id);
    if (notificationAssigneeIds.length > 0) {
      await prisma.notification.createMany({
        data: notificationAssigneeIds.map((assigneeId) => ({
          userId: assigneeId,
          dealId: deal.id,
          type: NotificationType.TASK_ASSIGNED,
          title: 'Task Assigned to You',
          message: `${user.name} assigned you "${input.title}".`,
        })),
      });
    }

    return task;
  }

  /**
   * Retrieves a task by ID enforcing visibility policies.
   */
  async getTaskById(user: AuthUser, id: string): Promise<TaskResponse> {
    const task = await taskRepository.findTaskWithContext(id);

    if (!task || task.teamId !== user.teamId || task.deal.deletedAt !== null) {
      throw new NotFoundError('Task not found');
    }

    if (!taskPolicy.canView(user, task, task.deal)) {
      throw new ForbiddenError('You do not have permission to view this task');
    }

    return {
      id: task.id,
      teamId: task.teamId,
      dealId: task.dealId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      createdById: task.createdById,
      assignedToId: task.assignees[0]?.userId ?? task.assignedToId ?? null,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      createdBy: task.createdBy,
      assignedTo: task.assignees[0]?.user ?? task.assignedTo ?? null,
      assignees: task.assignees.map((a) => ({
        id: a.id,
        userId: a.userId,
        assignedAt: a.assignedAt,
        completedAt: a.completedAt,
        completionNote: a.completionNote,
        user: a.user,
      })),
      deal: {
        id: task.deal.id,
        title: task.deal.title,
        stage: task.deal.stage,
      },
      company: task.deal.company,
    };
  }

  /**
   * Queries tasks with server-side filtering.
   */
  async listTasks(user: AuthUser, query: TaskListQuery): Promise<TaskListResponse> {
    return taskRepository.list(user, query);
  }

  /**
   * Updates task general attributes (title, description, priority, dueDate).
   * Note: Assignee modification is strictly immutable and forbidden post-creation.
   */
  async updateTask(user: AuthUser, id: string, input: UpdateTaskInput): Promise<TaskResponse> {
    const task = await taskRepository.findTaskWithContext(id);

    if (!task || task.teamId !== user.teamId || task.deal.deletedAt !== null) {
      throw new NotFoundError('Task not found');
    }

    if (!taskPolicy.canEdit(user, task, task.deal)) {
      throw new ForbiddenError('You do not have permission to edit this task');
    }

    return taskRepository.update(id, input);
  }

  /**
   * Completes the authenticated user's individual assignment on a task.
   * Marks the overall Task completed once all assignees complete.
   * Records DealHistory note if note provided and dispatches TASK_COMPLETED notification.
   */
  async completeTask(user: AuthUser, id: string, input: CompleteTaskInput): Promise<TaskResponse> {
    const task = await taskRepository.findTaskWithContext(id);

    if (!task || task.teamId !== user.teamId || task.deal.deletedAt !== null) {
      throw new NotFoundError('Task not found');
    }

    const userAssignee = task.assignees.find((a) => a.userId === user.id);
    if (!userAssignee) {
      throw new ForbiddenError('You are not assigned to this task');
    }

    if (userAssignee.completedAt !== null) {
      throw new BadRequestError('You have already completed your assignment on this task');
    }

    const updatedTask = await taskRepository.completeAssignee(
      id,
      user.id,
      input.completionNote
    );

    // Append immutable DealHistory note if note was provided
    if (input.completionNote && input.completionNote.trim()) {
      await prisma.dealHistory.create({
        data: {
          dealId: task.deal.id,
          actorId: user.id,
          type: HistoryType.NOTE_ADDED,
          note: `Task completed by ${user.name}: "${task.title}"\n\n${input.completionNote.trim()}`,
        },
      });
    }

    // Notify task creator if someone else completed their assignment
    if (task.createdById !== user.id) {
      const hasNote = Boolean(input.completionNote && input.completionNote.trim());
      const message = hasNote
        ? `${user.name} completed "${task.title}":\n"${input.completionNote!.trim()}"`
        : `${user.name} completed "${task.title}".`;

      await prisma.notification.create({
        data: {
          userId: task.createdById,
          dealId: task.deal.id,
          type: NotificationType.TASK_COMPLETED,
          title: 'Task Completed',
          message,
        },
      });
    }

    return updatedTask;
  }

  /**
   * Reopens the authenticated user's completed assignment on a task.
   * Recalculates overall Task completion (sets completedAt = null).
   */
  async reopenTask(user: AuthUser, id: string): Promise<TaskResponse> {
    const task = await taskRepository.findTaskWithContext(id);

    if (!task || task.teamId !== user.teamId || task.deal.deletedAt !== null) {
      throw new NotFoundError('Task not found');
    }

    const userAssignee = task.assignees.find((a) => a.userId === user.id);
    if (!userAssignee) {
      throw new ForbiddenError('You are not assigned to this task');
    }

    if (userAssignee.completedAt === null) {
      throw new BadRequestError('Your assignment is already open');
    }

    return taskRepository.reopenAssignee(id, user.id);
  }

  /**
   * Soft deletes a task.
   */
  async deleteTask(user: AuthUser, id: string): Promise<void> {
    const task = await taskRepository.findTaskWithContext(id);

    if (!task || task.teamId !== user.teamId || task.deal.deletedAt !== null) {
      throw new NotFoundError('Task not found');
    }

    if (!taskPolicy.canDelete(user, task, task.deal)) {
      throw new ForbiddenError('You do not have permission to delete this task');
    }

    await taskRepository.softDelete(id, user.id);
  }
}

export const taskService = new TaskService();
