import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma';
import { UnauthorizedError } from '../../errors/app-error';
import { signToken } from '../../utils/jwt';
import { AuthResponse, AuthUser, LoginInput } from './auth.types';

export class AuthService {
  /**
   * Authenticates a user with email and password credentials.
   * Emits a generic error message for invalid credentials to prevent email enumeration.
   */
  async login(credentials: LoginInput): Promise<AuthResponse> {
    const normalizedEmail = credentials.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      credentials.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signToken({ sub: user.id });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      teamId: user.teamId,
    };

    return {
      user: authUser,
      token,
    };
  }

  /**
   * Retrieves a user by ID from PostgreSQL, returning only safe fields.
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        teamId: true,
      },
    });

    return user;
  }
}

export const authService = new AuthService();
