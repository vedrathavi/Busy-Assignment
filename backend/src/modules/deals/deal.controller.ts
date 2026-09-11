import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../errors/app-error';
import { dealService } from './deal.service';
import {
  addCollaboratorSchema,
  addNoteSchema,
  collaboratorUserParamSchema,
  createDealSchema,
  dealIdParamSchema,
  dealQuerySchema,
  transitionStageSchema,
  updateDealSchema,
} from './deal.validator';

export class DealController {
  /**
   * POST /api/deals
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const validatedBody = createDealSchema.parse(req.body);
      const deal = await dealService.createDeal(req.user, validatedBody);

      res.status(201).json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/deals
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const validatedQuery = dealQuerySchema.parse(req.query);
      const result = await dealService.listDeals(req.user, validatedQuery);

      res.status(200).json({
        success: true,
        data: result.deals,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/deals/trash
   */
  async listTrash(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const validatedQuery = dealQuerySchema.parse(req.query);
      const result = await dealService.listTrash(req.user, validatedQuery);

      res.status(200).json({
        success: true,
        data: result.deals,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/deals/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = dealIdParamSchema.parse(req.params);
      const deal = await dealService.getDealById(req.user, id);

      res.status(200).json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/deals/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = dealIdParamSchema.parse(req.params);
      const validatedBody = updateDealSchema.parse(req.body);
      const updatedDeal = await dealService.updateDeal(req.user, id, validatedBody);

      res.status(200).json({
        success: true,
        data: updatedDeal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/deals/:id/stage
   */
  async transitionStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = dealIdParamSchema.parse(req.params);
      const validatedBody = transitionStageSchema.parse(req.body);
      const transitionedDeal = await dealService.transitionStage(req.user, id, validatedBody);

      res.status(200).json({
        success: true,
        data: transitionedDeal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/deals/:id/reopen
   */
  async reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = dealIdParamSchema.parse(req.params);
      const reopenedDeal = await dealService.reopenDeal(req.user, id);

      res.status(200).json({
        success: true,
        data: reopenedDeal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/deals/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = dealIdParamSchema.parse(req.params);
      const deletedDeal = await dealService.deleteDeal(req.user, id);

      res.status(200).json({
        success: true,
        data: deletedDeal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/deals/:id/collaborators
   */
  async listCollaborators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = dealIdParamSchema.parse(req.params);
      const collaborators = await dealService.listCollaborators(req.user, id);

      res.status(200).json({
        success: true,
        data: collaborators,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/deals/:id/collaborators
   */
  async addCollaborator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = dealIdParamSchema.parse(req.params);
      const validatedBody = addCollaboratorSchema.parse(req.body);
      const collaborator = await dealService.addCollaborator(req.user, id, validatedBody);

      res.status(201).json({
        success: true,
        data: collaborator,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/deals/:id/collaborators/:userId
   */
  async removeCollaborator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id, userId } = collaboratorUserParamSchema.parse(req.params);
      const result = await dealService.removeCollaborator(req.user, id, userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/deals/:id/notes
   */
  async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = dealIdParamSchema.parse(req.params);
      const validatedBody = addNoteSchema.parse(req.body);
      const note = await dealService.addNote(req.user, id, validatedBody);

      res.status(201).json({
        success: true,
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/deals/:id/history
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = dealIdParamSchema.parse(req.params);
      const history = await dealService.getDealHistory(req.user, id);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dealController = new DealController();
