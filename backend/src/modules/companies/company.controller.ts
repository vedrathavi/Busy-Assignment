import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../errors/app-error';
import { companyService } from './company.service';
import {
  companyIdParamSchema,
  companyQuerySchema,
  createCompanySchema,
  updateCompanySchema,
} from './company.validator';

export class CompanyController {
  /**
   * POST /api/companies
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const validatedBody = createCompanySchema.parse(req.body);
      const company = await companyService.createCompany(req.user, validatedBody);

      res.status(201).json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/companies
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const validatedQuery = companyQuerySchema.parse(req.query);
      const result = await companyService.listCompanies(req.user, validatedQuery);

      res.status(200).json({
        success: true,
        data: result.companies,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/companies/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = companyIdParamSchema.parse(req.params);
      const company = await companyService.getCompanyById(req.user, id);

      res.status(200).json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/companies/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = companyIdParamSchema.parse(req.params);
      const validatedBody = updateCompanySchema.parse(req.body);
      const updatedCompany = await companyService.updateCompany(req.user, id, validatedBody);

      res.status(200).json({
        success: true,
        data: updatedCompany,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/companies/:id/archive
   */
  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = companyIdParamSchema.parse(req.params);
      const company = await companyService.archiveCompany(req.user, id);

      res.status(200).json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/companies/:id/restore
   */
  async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = companyIdParamSchema.parse(req.params);
      const company = await companyService.restoreCompany(req.user, id);

      res.status(200).json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/companies/similar
   */
  async findSimilar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const name = typeof req.query.name === 'string' ? req.query.name : '';
      const matches = await companyService.findSimilarCompanies(req.user, name);

      res.status(200).json({
        success: true,
        data: matches,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const companyController = new CompanyController();
