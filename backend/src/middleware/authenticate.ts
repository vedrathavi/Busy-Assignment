import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/prisma';
import { UnauthorizedError } from '../errors/app-error';
import { verifyToken } from '../utils/jwt';

export async function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError('Authorization header missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      throw new UnauthorizedError('Malformed authorization header. Format must be: Bearer <token>');
    }

    const token = parts[1];
    const payload = verifyToken(token);

    // Authoritatively resolve user from PostgreSQL database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        teamId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User account associated with this token does not exist');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
