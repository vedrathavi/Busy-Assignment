import { Router } from 'express';
import { authenticateToken } from '../../middleware/authenticate';
import { taskController } from './task.controller';

const router = Router();

// All task endpoints require authentication
router.use(authenticateToken);

// Listing & Single Task Operations
router.get('/', (req, res, next) => taskController.list(req, res, next));
router.get('/:id', (req, res, next) => taskController.getById(req, res, next));
router.patch('/:id', (req, res, next) => taskController.update(req, res, next));
router.post('/:id/complete', (req, res, next) => taskController.complete(req, res, next));
router.post('/:id/reopen', (req, res, next) => taskController.reopen(req, res, next));
router.delete('/:id', (req, res, next) => taskController.delete(req, res, next));

export const taskRouter = router;
