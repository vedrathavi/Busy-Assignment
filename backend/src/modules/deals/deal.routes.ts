import { Router } from 'express';
import { authenticateToken } from '../../middleware/authenticate';
import { dealController } from './deal.controller';

const router = Router();

// All deal endpoints require authentication
router.use(authenticateToken);

// Creation and Listing
router.post('/', (req, res, next) => dealController.create(req, res, next));
router.get('/', (req, res, next) => dealController.list(req, res, next));

// Trash Listing (MUST be registered before /:id)
router.get('/trash', (req, res, next) => dealController.listTrash(req, res, next));

// Single Deal Operations
router.get('/:id', (req, res, next) => dealController.getById(req, res, next));
router.patch('/:id', (req, res, next) => dealController.update(req, res, next));
router.patch('/:id/stage', (req, res, next) => dealController.transitionStage(req, res, next));
router.post('/:id/reopen', (req, res, next) => dealController.reopen(req, res, next));
router.delete('/:id', (req, res, next) => dealController.delete(req, res, next));

export const dealRouter = router;
