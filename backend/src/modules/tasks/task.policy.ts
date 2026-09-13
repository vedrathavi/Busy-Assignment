import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';

export interface DealContext {
  teamId: string;
  ownerId: string;
  collaborators?: Array<{ userId: string }>;
}

export interface TaskContext {
  teamId: string;
  createdById: string;
  assignees?: Array<{ userId: string; completedAt?: Date | null }>;
}

export interface TargetAssigneeContext {
  id: string;
  role: UserRole;
  teamId: string;
}

export class TaskPolicy {
  /**
   * Evaluates if the user can create a task for a given deal.
   * - Manager: Allowed on any team deal.
   * - Sales Rep: Allowed ONLY if Deal Owner or active Deal Collaborator.
   */
  canCreate(user: AuthUser, deal: DealContext): boolean {
    if (user.teamId !== deal.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    if (deal.ownerId === user.id) {
      return true;
    }
    return deal.collaborators?.some((c) => c.userId === user.id) ?? false;
  }

  /**
   * Evaluates if the user can assign a task to the target assignee.
   * - Target must be a Sales Rep in the same team.
   * - Eligible assignees are strictly: Deal Owner OR active Deal Collaborators on this deal.
   * - Applies uniformly to Managers, Deal Owners, and Collaborators.
   */
  canAssign(user: AuthUser, deal: DealContext, targetAssignee: TargetAssigneeContext): boolean {
    if (user.teamId !== deal.teamId || targetAssignee.teamId !== user.teamId) {
      return false;
    }

    // Task assignees must strictly be Sales Reps
    if (targetAssignee.role !== UserRole.SALES_REP) {
      return false;
    }

    // Must be Deal Owner or active Deal Collaborator on this specific deal
    const isDealOwner = deal.ownerId === targetAssignee.id;
    const isDealCollaborator = deal.collaborators?.some((c) => c.userId === targetAssignee.id) ?? false;

    return isDealOwner || isDealCollaborator;
  }

  /**
   * Evaluates if the user can view an existing task.
   * - Manager: Team-wide.
   * - Deal Owner: Allowed.
   * - Deal Collaborator: Allowed.
   * - Any Task Assignee: Allowed.
   * - Task Creator: Allowed.
   */
  canView(user: AuthUser, task: TaskContext, deal: DealContext): boolean {
    if (user.teamId !== task.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    if (task.assignees?.some((a) => a.userId === user.id)) {
      return true;
    }
    if (task.createdById === user.id) {
      return true;
    }
    if (deal.ownerId === user.id) {
      return true;
    }
    return deal.collaborators?.some((c) => c.userId === user.id) ?? false;
  }

  /**
   * Evaluates if the user can edit general task attributes (title, description, priority, dueDate).
   * Note: Assignee modification is strictly prohibited for all users post-creation.
   */
  canEdit(user: AuthUser, task: TaskContext, deal: DealContext): boolean {
    if (user.teamId !== task.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    if (task.createdById === user.id) {
      return true;
    }
    if (task.assignees?.some((a) => a.userId === user.id)) {
      return true;
    }
    return deal.ownerId === user.id;
  }

  /**
   * Evaluates if the user can complete their own assignment on a task.
   * - The user must be one of the assignees on the task.
   */
  canComplete(user: AuthUser, task: TaskContext, deal: DealContext): boolean {
    if (user.teamId !== task.teamId) {
      return false;
    }
    // Only assigned users can complete their own assignment
    return task.assignees?.some((a) => a.userId === user.id) ?? false;
  }

  /**
   * Evaluates if the user can reopen their own completed assignment on a task.
   * - The user must be one of the assignees on the task.
   */
  canReopen(user: AuthUser, task: TaskContext, deal: DealContext): boolean {
    if (user.teamId !== task.teamId) {
      return false;
    }
    return task.assignees?.some((a) => a.userId === user.id) ?? false;
  }

  /**
   * Evaluates if the user can soft-delete a task.
   * - Manager, Deal Owner, or Task Creator.
   */
  canDelete(user: AuthUser, task: { teamId: string; createdById: string }, deal: { teamId: string; ownerId: string }): boolean {
    if (user.teamId !== task.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    if (task.createdById === user.id) {
      return true;
    }
    return deal.ownerId === user.id;
  }
}

export const taskPolicy = new TaskPolicy();
