import prisma from '../config/database';
import { comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorMiddleware';

export class AuthService {
  public static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new AppError('Invalid credentials or account inactive', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const token = generateToken({
      userId: Number(user.id),
      email: user.email,
      roles,
    });

    return {
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        roles,
      },
    };
  }

  public static async getMe(userId: number | bigint) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roles: user.userRoles.map((ur) => ur.role.code),
    };
  }
}
