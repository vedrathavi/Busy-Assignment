import { Prisma, TaskPriority, UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AuthUser } from '../auth/auth.types';
import {
  TaskListQuery,
  TaskListResponse,
  TaskResponse,
  UpdateTaskInput,
} from './task.types';

const taskSelect = {
  id: true,
  teamId: true,
  dealId: true,
  title: true,
  description: true,
  priority: true,
  createdById: true,
  assignedToId: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  assignees: {
    select: {
      id: true,
      userId: true,
      assignedAt: true,
      completedAt: true,
      completionNote: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  deal: {
    select: {
      id: true,
      title: true,
      stage: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

type RawTaskRecord = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

function mapTaskResponse(record: RawTaskRecord): TaskResponse {
  return {
    id: record.id,
    teamId: record.teamId,
    dealId: record.dealId,
    title: record.title,
    description: record.description,
    priority: record.priority,
    createdById: record.createdById,
    assignedToId: record.assignees[0]?.userId ?? record.assignedToId ?? null,
    dueDate: record.dueDate,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    assignedTo: record.assignees[0]?.user ?? record.assignedTo ?? null,
    assignees: record.assignees.map((a) => ({
      id: a.id,
      userId: a.userId,
      assignedAt: a.assignedAt,
      completedAt: a.completedAt,
      completionNote: a.completionNote,
      user: a.user,
    })),
    deal: {
      id: record.deal.id,
      title: record.deal.title,
      stage: record.deal.stage,
    },
    company: record.deal.company,
  };
}

export class TaskRepository {
  /**
   * Creates a new Task and associated TaskAssignee records within a transaction.
   */
  async create(
    data: {
      title: string;
      description?: string | null;
      priority?: TaskPriority;
      assignedToIds: string[];
      dueDate: string | Date;
      teamId: string;
      dealId: string;
      createdById: string;
    },
    tx?: Prisma.TransactionClient
  ): Promise<TaskResponse> {
    const client = tx || prisma;
    const dueDate = typeof data.dueDate === 'string'
      ? new Date(`${data.dueDate.slice(0, 10)}T00:00:00.000Z`)
      : data.dueDate;

    const record = await client.task.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        priority: data.priority ?? TaskPriority.MEDIUM,
        teamId: data.teamId,
        dealId: data.dealId,
        createdById: data.createdById,
        assignedToId: data.assignedToIds[0] || null,
        dueDate,
        assignees: {
          create: data.assignedToIds.map((userId) => ({
            userId,
          })),
        },
      },
      select: taskSelect,
    });

    return mapTaskResponse(record);
  }

  /**
   * Finds a task by ID including relations.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<TaskResponse | null> {
    const client = tx || prisma;
    const record = await client.task.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: taskSelect,
    });

    return record ? mapTaskResponse(record) : null;
  }

  /**
   * Finds a task with full deal, assignee, and collaborator context for authorization evaluation.
   */
  async findTaskWithContext(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.task.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        ...taskSelect,
        deal: {
          select: {
            id: true,
            teamId: true,
            ownerId: true,
            title: true,
            stage: true,
            deletedAt: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            collaborators: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Queries tasks with server-side filtering, time boundaries, status, and pagination.
   * Excludes soft-deleted tasks and tasks belonging to soft-deleted deals.
   */
  async list(user: AuthUser, query: TaskListQuery): Promise<TaskListResponse> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const where: Prisma.TaskWhereInput = {
      teamId: user.teamId,
      deletedAt: null,
      deal: {
        deletedAt: null,
      },
    };

    // Deal Scoping
    if (query.dealId) {
      where.dealId = query.dealId;
    }

    // Role & Perspective Scope
    const scope = query.scope || 'assigned_to_me';
    if (scope === 'assigned_to_me' || scope === 'mine') {
      where.assignees = {
        some: {
          userId: user.id,
        },
      };
    } else if (scope === 'assigned_by_me') {
      where.createdById = user.id;
    } else if (scope === 'team') {
      if (user.role === UserRole.SALES_REP) {
        where.OR = [
          { assignees: { some: { userId: user.id } } },
          { createdById: user.id },
          { deal: { ownerId: user.id } },
          { deal: { collaborators: { some: { userId: user.id } } } },
        ];
      }
      // Managers have full team visibility
    }

    // Assignee Filter (applied on top of perspective)
    if (query.assignedToId) {
      if (where.assignees) {
        where.AND = [
          { assignees: { some: { userId: query.assignedToId } } },
        ];
      } else {
        where.assignees = {
          some: {
            userId: query.assignedToId,
          },
        };
      }
    }

    // Status Filter (All, Open, Completed)
    if (query.status === 'open') {
      where.completedAt = null;
    } else if (query.status === 'completed') {
      where.completedAt = { not: null };
    }

    // Priority Filter
    if (query.priority && query.priority !== 'all') {
      where.priority = query.priority.toUpperCase() as TaskPriority;
    }

    // Time Filter (Calendar Date boundaries with AND semantics)
    if (query.time === 'today') {
      where.dueDate = { gte: startOfToday, lt: startOfTomorrow };
    } else if (query.time === 'upcoming') {
      where.dueDate = { gte: startOfTomorrow };
    } else if (query.time === 'overdue') {
      where.dueDate = { lt: startOfToday };
      where.completedAt = null;
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    // Base scoping for summary calculation
    const summaryBaseWhere: Prisma.TaskWhereInput = {
      teamId: user.teamId,
      deletedAt: null,
      deal: {
        deletedAt: null,
      },
    };
    if (query.dealId) {
      summaryBaseWhere.dealId = query.dealId;
    }
    if (scope === 'assigned_to_me' || scope === 'mine') {
      summaryBaseWhere.assignees = {
        some: {
          userId: user.id,
        },
      };
    } else if (scope === 'assigned_by_me') {
      summaryBaseWhere.createdById = user.id;
    } else if (scope === 'team') {
      if (user.role === UserRole.SALES_REP) {
        summaryBaseWhere.OR = [
          { assignees: { some: { userId: user.id } } },
          { createdById: user.id },
          { deal: { ownerId: user.id } },
          { deal: { collaborators: { some: { userId: user.id } } } },
        ];
      }
    }

    const [records, total, openCount, dueTodayCount, overdueCount] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        select: taskSelect,
        orderBy: [
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take,
      }),
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...summaryBaseWhere, completedAt: null } }),
      prisma.task.count({ where: { ...summaryBaseWhere, completedAt: null, dueDate: { gte: startOfToday, lt: startOfTomorrow } } }),
      prisma.task.count({ where: { ...summaryBaseWhere, completedAt: null, dueDate: { lt: startOfToday } } }),
    ]);

    const totalPages = Math.ceil(total / query.limit) || 1;

    return {
      tasks: records.map(mapTaskResponse),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
      summary: {
        open: openCount,
        dueToday: dueTodayCount,
        overdue: overdueCount,
      },
    };
  }

  /**
   * Updates task attributes (no assignee modification permitted).
   */
  async update(
    id: string,
    data: UpdateTaskInput,
    tx?: Prisma.TransactionClient
  ): Promise<TaskResponse> {
    const client = tx || prisma;
    const dueDate = data.dueDate
      ? typeof data.dueDate === 'string'
        ? new Date(`${data.dueDate.slice(0, 10)}T00:00:00.000Z`)
        : data.dueDate
      : undefined;

    const record = await client.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(dueDate !== undefined && { dueDate }),
      },
      select: taskSelect,
    });

    return mapTaskResponse(record);
  }

  /**
   * Completes an individual assignee's assignment and marks the task completed if all are done.
   */
  async completeAssignee(
    taskId: string,
    userId: string,
    completionNote?: string,
    tx?: Prisma.TransactionClient
  ): Promise<TaskResponse> {
    const client = tx || prisma;
    const now = new Date();

    // 1. Mark assignee as completed
    await client.taskAssignee.update({
      where: {
        taskId_userId: {
          taskId,
          userId,
        },
      },
      data: {
        completedAt: now,
        completionNote: completionNote || null,
      },
    });

    // 2. Check if all assignees are now completed
    const remainingIncomplete = await client.taskAssignee.count({
      where: {
        taskId,
        completedAt: null,
      },
    });

    // 3. If all assignees completed, mark overall Task as completed
    if (remainingIncomplete === 0) {
      await client.task.update({
        where: { id: taskId },
        data: { completedAt: now },
      });
    }

    const updatedTask = await client.task.findUniqueOrThrow({
      where: { id: taskId },
      select: taskSelect,
    });

    return mapTaskResponse(updatedTask);
  }

  /**
   * Reopens an individual assignee's assignment and resets overall Task completedAt to null.
   */
  async reopenAssignee(
    taskId: string,
    userId: string,
    tx?: Prisma.TransactionClient
  ): Promise<TaskResponse> {
    const client = tx || prisma;

    // 1. Reopen assignee
    await client.taskAssignee.update({
      where: {
        taskId_userId: {
          taskId,
          userId,
        },
      },
      data: {
        completedAt: null,
      },
    });

    // 2. Reset overall Task completion to null
    await client.task.update({
      where: { id: taskId },
      data: { completedAt: null },
    });

    const updatedTask = await client.task.findUniqueOrThrow({
      where: { id: taskId },
      select: taskSelect,
    });

    return mapTaskResponse(updatedTask);
  }

  /**
   * Soft deletes a task.
   */
  async softDelete(id: string, actorId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || prisma;
    await client.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
      },
    });
  }
}

export const taskRepository = new TaskRepository();
