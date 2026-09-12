import { Router } from 'express';
import { authenticateToken } from '../../middleware/authenticate';
import { userController } from './user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

router.get('/', (req, res, next) => userController.listUsers(req, res, next));
router.get('/:id', (req, res, next) => userController.getUserProfile(req, res, next));

export const userRouter = router;
