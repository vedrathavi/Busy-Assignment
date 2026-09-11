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

// Bulk Operations (MUST be registered before /:id)
router.post('/bulk/reassign', (req, res, next) => dealController.bulkReassign(req, res, next));
router.post('/bulk/advance', (req, res, next) => dealController.bulkAdvance(req, res, next));

// Pipeline CSV Export (MUST be registered before /:id)
router.get('/export', (req, res, next) => dealController.exportCsv(req, res, next));

// Single Deal Operations
router.get('/:id', (req, res, next) => dealController.getById(req, res, next));
router.patch('/:id', (req, res, next) => dealController.update(req, res, next));
router.patch('/:id/stage', (req, res, next) => dealController.transitionStage(req, res, next));
router.post('/:id/reopen', (req, res, next) => dealController.reopen(req, res, next));
router.delete('/:id', (req, res, next) => dealController.delete(req, res, next));

// Collaborator Management
router.get('/:id/collaborators', (req, res, next) => dealController.listCollaborators(req, res, next));
router.post('/:id/collaborators', (req, res, next) => dealController.addCollaborator(req, res, next));
router.delete('/:id/collaborators/:userId', (req, res, next) => dealController.removeCollaborator(req, res, next));

// Deal Notes
router.post('/:id/notes', (req, res, next) => dealController.addNote(req, res, next));

// Immutable History API
router.get('/:id/history', (req, res, next) => dealController.getHistory(req, res, next));

export const dealRouter = router;
