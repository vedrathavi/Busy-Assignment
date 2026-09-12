import { Request, Response, NextFunction } from 'express';
import { userService, UserService } from './user.service';
import { userQuerySchema, userIdParamSchema } from './user.validator';
import { UnauthorizedError } from '../../errors/app-error';

export class UserController {
  constructor(private readonly service: UserService = userService) {}

  /**
   * GET /api/users
   */
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const validatedQuery = userQuerySchema.parse(req.query);
      const users = await this.service.listUsers(req.user, validatedQuery);

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id
   */
  async getUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = userIdParamSchema.parse(req.params);
      const profile = await this.service.getUserProfile(req.user, id);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
