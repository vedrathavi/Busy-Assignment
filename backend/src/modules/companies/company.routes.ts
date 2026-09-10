import { Router } from 'express';
import { authenticateToken } from '../../middleware/authenticate';
import { companyController } from './company.controller';

export const companyRouter = Router();

// All company routes strictly require authenticated request context
companyRouter.use(authenticateToken);

companyRouter.post('/', (req, res, next) => companyController.create(req, res, next));
companyRouter.get('/', (req, res, next) => companyController.list(req, res, next));
companyRouter.get('/:id', (req, res, next) => companyController.getById(req, res, next));
companyRouter.patch('/:id', (req, res, next) => companyController.update(req, res, next));
companyRouter.post('/:id/archive', (req, res, next) => companyController.archive(req, res, next));
companyRouter.post('/:id/restore', (req, res, next) => companyController.restore(req, res, next));
