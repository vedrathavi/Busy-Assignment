import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../errors/app-error';
import { taskService } from './task.service';
import {
  completeTaskSchema,
  createTaskSchema,
  dealIdParamSchema,
  taskIdParamSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from './task.validator';

export class TaskController {
  /**
   * GET /api/tasks
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const validatedQuery = taskListQuerySchema.parse(req.query);
      const result = await taskService.listTasks(req.user, validatedQuery);

      res.status(200).json({
        success: true,
        data: result.tasks,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tasks/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = taskIdParamSchema.parse(req.params);
      const task = await taskService.getTaskById(req.user, id);

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/deals/:dealId/tasks
   */
  async createForDeal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const params = dealIdParamSchema.parse(req.params);
      const dealId = (params.dealId || params.id) as string;
      const validatedInput = createTaskSchema.parse(req.body);
      const task = await taskService.createTask(req.user, dealId, validatedInput);

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/tasks/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = taskIdParamSchema.parse(req.params);
      const validatedInput = updateTaskSchema.parse(req.body);
      const task = await taskService.updateTask(req.user, id, validatedInput);

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tasks/:id/complete
   */
  async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = taskIdParamSchema.parse(req.params);
      const validatedInput = completeTaskSchema.parse(req.body || {});
      const task = await taskService.completeTask(req.user, id, validatedInput);

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tasks/:id/reopen
   */
  async reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = taskIdParamSchema.parse(req.params);
      const task = await taskService.reopenTask(req.user, id);

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/tasks/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = taskIdParamSchema.parse(req.params);
      await taskService.deleteTask(req.user, id);

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
