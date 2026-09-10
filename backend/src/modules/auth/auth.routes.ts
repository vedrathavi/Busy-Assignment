import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticateToken } from '../../middleware/authenticate';

export const authRouter = Router();

authRouter.post('/login', (req, res, next) => authController.login(req, res, next));
authRouter.get('/me', authenticateToken, (req, res, next) => authController.getMe(req, res, next));
