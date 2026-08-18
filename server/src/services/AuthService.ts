import prisma from '../config/database';
import { comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorMiddleware';

export class AuthService {
  public static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            role: { select: { code: true, name: true } },
            business: { select: { id: true, name: true, slug: true, logo: true, status: true, plan: true } },
          },
          orderBy: [{ isDefault: 'desc' }, { joinedAt: 'asc' }],
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

    // Find default Biz (or first available)
    const defaultMembership = user.memberships.find((m) => m.isDefault) || user.memberships[0];
    const defaultBizId = defaultMembership ? Number(defaultMembership.businessId) : undefined;

    const token = generateToken({
      userId: Number(user.id),
      email: user.email,
      defaultBizId,
    });

    // Build businesses list
    const businesses = user.memberships.map((m) => ({
      id: m.business.id.toString(),
      name: m.business.name,
      slug: m.business.slug,
      logo: m.business.logo,
      status: m.business.status,
      plan: m.business.plan,
      roleCode: m.role.code,
      roleName: m.role.name,
      isDefault: m.isDefault,
    }));

    // Active Biz context
    const activeBiz = defaultMembership
      ? {
          id: defaultMembership.business.id.toString(),
          name: defaultMembership.business.name,
          slug: defaultMembership.business.slug,
          logo: defaultMembership.business.logo,
          role: defaultMembership.role.code,
          roleName: defaultMembership.role.name,
        }
      : null;

    return {
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
      businesses,
      activeBiz,
    };
  }

  public static async getMe(userId: number | bigint) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            role: { select: { code: true, name: true } },
            business: { select: { id: true, name: true, slug: true, logo: true, status: true, plan: true } },
          },
          orderBy: [{ isDefault: 'desc' }, { joinedAt: 'asc' }],
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
      memberships: user.memberships.map((m) => ({
        bizId: m.business.id.toString(),
        bizName: m.business.name,
        bizSlug: m.business.slug,
        bizLogo: m.business.logo,
        bizStatus: m.business.status,
        roleCode: m.role.code,
        roleName: m.role.name,
        isDefault: m.isDefault,
      })),
    };
  }
}
