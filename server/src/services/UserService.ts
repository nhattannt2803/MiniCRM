import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { AppError } from '../middleware/errorMiddleware';

export class UserService {
  public static async getUsers() {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        userRoles: {
          include: { role: true },
        },
        _count: {
          select: { leads: true, opportunities: true, tasksAssigned: true },
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
      roles: u.userRoles.map((ur) => ur.role.code),
      roleNames: u.userRoles.map((ur) => ur.role.name),
      stats: {
        leadsCount: u._count.leads,
        dealsCount: u._count.opportunities,
        tasksCount: u._count.tasksAssigned,
      },
    }));
  }

  public static async createUser(data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleCodes?: string[];
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email đã được sử dụng trong hệ thống', 400, 'EMAIL_EXISTS');
    }

    const passwordHash = await hashPassword(data.password || 'Password123!');
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        isActive: true,
      },
    });

    // Assign roles
    const roleCodes = data.roleCodes && data.roleCodes.length > 0 ? data.roleCodes : ['SALES_REP'];
    const roles = await prisma.role.findMany({
      where: { code: { in: roleCodes } },
    });

    for (const r of roles) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: r.id,
        },
      });
    }

    return {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      roles: roleCodes,
    };
  }

  public static async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { isActive },
    });

    return { id: user.id.toString(), isActive: user.isActive };
  }

  public static async getStaff() {
    const users = await this.getUsers();
    // Return staff metrics suitable for management directory
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

  public static async getTeams() {
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
        description: 'Chuyên trách tư vấn & chốt đơn sản phẩm xe điệnMOVE Pro / Urban.',
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
      {
        id: 'team-3',
        name: 'Đội Bất Động Sản & Dự Án',
        code: 'SALES_REALTOR',
        leaderName: 'Lê Văn Bất Động Sản',
        memberCount: 6,
        targetRevenue: 3000000000,
        achievedRevenue: 2100000000,
        leadCount: 65,
        description: 'Tư vấn căn hộ cao cấp & biệt thự nghỉ dưỡng.',
      },
      {
        id: 'team-4',
        name: 'Telesale & Inbound Leads',
        code: 'TELESALE_INBOUND',
        leaderName: 'Phạm Thị Tele',
        memberCount: 8,
        targetRevenue: 400000000,
        achievedRevenue: 390000000,
        leadCount: 110,
        description: 'Tiếp nhận Lead inbound, phân loại và chuyển tiếp cho Sales Rep.',
      },
    ];
  }

  public static async getRoles() {
    const roles = await prisma.role.findMany();
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

  public static async allocateLeads(leadIds: (string | number)[], ownerId: string | number) {
    const bigintIds = leadIds.map((id) => BigInt(id));
    const bigintOwner = BigInt(ownerId);

    const updated = await prisma.lead.updateMany({
      where: { id: { in: bigintIds } },
      data: { ownerId: bigintOwner },
    });

    return { count: updated.count, ownerId: ownerId.toString() };
  }
}
