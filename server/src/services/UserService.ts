import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { AppError } from '../middleware/errorMiddleware';

export class UserService {
  public static async getUsers(bizId: bigint) {
    const members = await prisma.businessMember.findMany({
      where: { businessId: bizId, isActive: true },
      include: {
        user: {
          include: {
            _count: {
              select: { leads: true, opportunities: true, tasksAssigned: true },
            },
          },
        },
        role: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.user.id.toString(),
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      phone: m.user.phone,
      isActive: m.user.isActive && m.isActive,
      createdAt: m.user.createdAt,
      roles: [m.role.code],
      roleNames: [m.role.name],
      stats: {
        leadsCount: m.user._count.leads,
        dealsCount: m.user._count.opportunities,
        tasksCount: m.user._count.tasksAssigned,
      },
    }));
  }

  public static async createUser(bizId: bigint, data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleCodes?: string[];
  }) {
    const roleCode = (data.roleCodes && data.roleCodes[0]) || 'SALES';

    // Check role exists for this biz
    const role = await prisma.role.findFirst({
      where: { bizId, code: roleCode },
    });
    if (!role) {
      throw new AppError(`Role ${roleCode} không tồn tại trong doanh nghiệp`, 400, 'ROLE_NOT_FOUND');
    }

    let user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      const passwordHash = await hashPassword(data.password || 'Password123!');
      user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          isActive: true,
        },
      });
    }

    // Check if already member
    const existingMember = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: bizId, userId: user.id } },
    });

    if (existingMember) {
      throw new AppError('Người dùng đã là thành viên của doanh nghiệp này', 400, 'ALREADY_MEMBER');
    }

    await prisma.businessMember.create({
      data: {
        businessId: bizId,
        userId: user.id,
        roleId: role.id,
        isDefault: false,
        isActive: true,
      },
    });

    return {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roles: [roleCode],
    };
  }

  public static async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { isActive },
    });

    return { id: user.id.toString(), isActive: user.isActive };
  }

  public static async changeUserPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.trim().length < 6) {
      throw new AppError('Mật khẩu mới phải có ít nhất 6 ký tự', 400, 'INVALID_PASSWORD');
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!existingUser || existingUser.deletedAt) {
      throw new AppError('Không tìm thấy tài khoản người dùng', 404, 'USER_NOT_FOUND');
    }

    const passwordHash = await hashPassword(newPassword.trim());

    const user = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { passwordHash },
    });

    return {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  public static async getStaff(bizId: bigint) {
    const users = await this.getUsers(bizId);
    return users.map((u) => ({
      ...u,
      department: u.roles.includes('ADMIN')
        ? 'Ban Giám Đốc'
        : u.roles.includes('SALES_MANAGER')
        ? 'Phòng Kinh Doanh'
        : u.roles.includes('TELEMARKETING')
        ? 'Đội Telemarketing'
        : 'Phòng Bán Hàng',
      targetQuota: 100000000,
      currentSales: Math.floor(Math.random() * 80000000) + 20000000,
      conversionRate: (Math.random() * 25 + 15).toFixed(1) + '%',
      status: u.isActive ? 'Active' : 'Inactive',
    }));
  }

  public static async getTeams(bizId: bigint) {
    return [
      {
        id: 'team-1',
        name: 'Đội Kinh Doanh Xe Điện MOVE',
        code: 'SALES_MOVE',
        leaderName: 'Nguyễn Văn Quản Lý',
        memberCount: 5,
        targetRevenue: 500000000,
        achievedRevenue: 340000000,
        leadCount: 42,
        description: 'Chuyên trách tư vấn & chốt đơn sản phẩm xe điện MOVE Pro / Urban.',
      },
      {
        id: 'team-2',
        name: 'Phòng Bán Hàng Enterprise SaaS',
        code: 'SALES_SAAS',
        leaderName: 'Trần Thị Trưởng Phòng',
        memberCount: 4,
        targetRevenue: 1200000000,
        achievedRevenue: 980000000,
        leadCount: 28,
        description: 'Tư vấn giải pháp phần mềm quản trị cho doanh nghiệp B2B.',
      },
    ];
  }

  public static async getRoles(bizId: bigint) {
    const roles = await prisma.role.findMany({
      where: { bizId },
    });
    return roles.map((r) => ({
      id: r.id.toString(),
      name: r.name,
      code: r.code,
      description: r.description,
      permissions: {
        leads: r.code === 'ADMIN' ? ['read', 'create', 'edit', 'delete', 'export'] : ['read', 'create', 'edit'],
        companies: r.code === 'ADMIN' ? ['read', 'create', 'edit', 'delete'] : ['read', 'create'],
        deals: r.code === 'ADMIN' ? ['read', 'create', 'edit', 'delete'] : ['read', 'create', 'edit'],
        staff: r.code === 'ADMIN' ? ['read', 'create', 'edit', 'delete'] : ['read'],
        settings: r.code === 'ADMIN' ? ['read', 'edit'] : [],
      },
    }));
  }

  public static async getAllSystemUsers() {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          include: {
            business: { select: { id: true, name: true, slug: true } },
            role: { select: { code: true, name: true } },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id.toString(),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      isActive: u.isActive,
      createdAt: u.createdAt,
      memberships: u.memberships.map((m) => ({
        bizId: m.business.id.toString(),
        bizName: m.business.name,
        bizSlug: m.business.slug,
        roleCode: m.role.code,
        roleName: m.role.name,
        isActive: m.isActive,
      })),
    }));
  }

  public static async allocateLeads(bizId: bigint, leadIds: (string | number)[], ownerId: string | number) {
    const bigintIds = leadIds.map((id) => BigInt(id));
    const bigintOwner = BigInt(ownerId);

    const updated = await prisma.lead.updateMany({
      where: { bizId, id: { in: bigintIds } },
      data: { ownerId: bigintOwner },
    });

    return { count: updated.count, ownerId: ownerId.toString() };
  }
}

