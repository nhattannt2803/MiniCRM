import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class BusinessService {
  /**
   * Lấy danh sách Biz mà user tham gia
   */
  public static async getMyBusinesses(userId: number | bigint) {
    const memberships = await prisma.businessMember.findMany({
      where: {
        userId: BigInt(userId),
        isActive: true,
      },
      include: {
        business: true,
        role: { select: { code: true, name: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { joinedAt: 'asc' }],
    });

    return memberships.map((m) => ({
      id: m.business.id.toString(),
      name: m.business.name,
      slug: m.business.slug,
      logo: m.business.logo,
      status: m.business.status,
      plan: m.business.plan,
      roleCode: m.role.code,
      roleName: m.role.name,
      isDefault: m.isDefault,
      joinedAt: m.joinedAt,
    }));
  }

  /**
   * Tạo Business mới (user trở thành ADMIN)
   */
  public static async createBusiness(userId: number | bigint, data: {
    name: string;
    slug: string;
    taxCode?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    const uId = BigInt(userId);

    // Check slug unique
    const existing = await prisma.business.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new AppError('Mã doanh nghiệp (slug) đã tồn tại', 400, 'SLUG_EXISTS');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Business
      const biz = await tx.business.create({
        data: {
          name: data.name,
          slug: data.slug,
          taxCode: data.taxCode || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          status: 'ACTIVE',
          plan: 'FREE',
        },
      });

      // 2. Create default roles for this Biz
      const adminRole = await tx.role.create({
        data: { bizId: biz.id, name: 'Administrator', code: 'ADMIN', description: 'Quản trị viên hệ thống CRM' },
      });
      await tx.role.create({
        data: { bizId: biz.id, name: 'Sales Manager', code: 'SALES_MANAGER', description: 'Quản lý kinh doanh' },
      });
      await tx.role.create({
        data: { bizId: biz.id, name: 'Sales Executive', code: 'SALES', description: 'Chuyên viên tư vấn & bán hàng' },
      });
      await tx.role.create({
        data: { bizId: biz.id, name: 'Telemarketing', code: 'TELEMARKETING', description: 'Nhân viên Telesale' },
      });

      // 3. Add creator as ADMIN member (default Biz)
      // First unset any existing default
      await tx.businessMember.updateMany({
        where: { userId: uId, isDefault: true },
        data: { isDefault: false },
      });

      await tx.businessMember.create({
        data: {
          businessId: biz.id,
          userId: uId,
          roleId: adminRole.id,
          isDefault: true,
          isActive: true,
        },
      });

      // 4. Create default Pipeline
      const pipeline = await tx.pipeline.create({
        data: {
          bizId: biz.id,
          name: 'Quy trình bán hàng mặc định',
          isDefault: true,
          isActive: true,
        },
      });

      const defaultStages = [
        { name: 'Tiếp nhận', code: 'QUALIFICATION', orderNo: 1, probability: 10 },
        { name: 'Phân tích nhu cầu', code: 'NEEDS_ANALYSIS', orderNo: 2, probability: 25 },
        { name: 'Đề xuất giải pháp', code: 'PROPOSAL', orderNo: 3, probability: 50 },
        { name: 'Đàm phán', code: 'NEGOTIATION', orderNo: 4, probability: 75 },
        { name: 'Chốt thành công', code: 'CLOSED_WON', orderNo: 5, probability: 100, isWon: true },
        { name: 'Thất bại', code: 'CLOSED_LOST', orderNo: 6, probability: 0, isLost: true },
      ];

      for (const stage of defaultStages) {
        await tx.pipelineStage.create({
          data: {
            pipelineId: pipeline.id,
            name: stage.name,
            code: stage.code,
            orderNo: stage.orderNo,
            probability: stage.probability,
            isWon: stage.isWon || false,
            isLost: stage.isLost || false,
            stageCategory: stage.isWon ? 'WON' : stage.isLost ? 'LOST' : 'OPEN',
          },
        });
      }

      return biz;
    });

    return {
      id: result.id.toString(),
      name: result.name,
      slug: result.slug,
      status: result.status,
      plan: result.plan,
    };
  }

  /**
   * Cập nhật thông tin Business
   */
  public static async updateBusiness(bizId: bigint, data: {
    name?: string;
    logo?: string;
    taxCode?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    const biz = await prisma.business.update({
      where: { id: bizId },
      data: {
        name: data.name,
        logo: data.logo,
        taxCode: data.taxCode,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
    });

    return {
      id: biz.id.toString(),
      name: biz.name,
      slug: biz.slug,
      logo: biz.logo,
      status: biz.status,
    };
  }

  /**
   * Lấy danh sách members của Biz
   */
  public static async getBizMembers(bizId: bigint) {
    const members = await prisma.businessMember.findMany({
      where: { businessId: bizId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true } },
        role: { select: { id: true, code: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id.toString(),
      userId: m.user.id.toString(),
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      phone: m.user.phone,
      isUserActive: m.user.isActive,
      roleCode: m.role.code,
      roleName: m.role.name,
      roleId: m.role.id.toString(),
      isActive: m.isActive,
      isDefault: m.isDefault,
      joinedAt: m.joinedAt,
    }));
  }

  /**
   * Mời thành viên vào Biz (tạo hoặc gán user hiện có)
   */
  public static async inviteMember(bizId: bigint, data: {
    email: string;
    roleCode: string;
    firstName?: string;
    lastName?: string;
  }) {
    // Find role in this Biz
    const role = await prisma.role.findFirst({
      where: { bizId: bizId, code: data.roleCode },
    });
    if (!role) {
      throw new AppError(`Role "${data.roleCode}" không tồn tại trong doanh nghiệp này`, 400, 'ROLE_NOT_FOUND');
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      // Import will create user later — for now just throw
      throw new AppError('User với email này chưa tồn tại. Vui lòng tạo tài khoản trước.', 404, 'USER_NOT_FOUND');
    }

    // Check if already member
    const existing = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: bizId, userId: user.id } },
    });
    if (existing) {
      throw new AppError('Người dùng đã là thành viên của doanh nghiệp này', 400, 'ALREADY_MEMBER');
    }

    const member = await prisma.businessMember.create({
      data: {
        businessId: bizId,
        userId: user.id,
        roleId: role.id,
        isDefault: false,
        isActive: true,
      },
    });

    return { id: member.id.toString(), userId: user.id.toString(), roleCode: data.roleCode };
  }

  /**
   * Xóa thành viên khỏi Biz
   */
  public static async removeMember(bizId: bigint, targetUserId: string | number) {
    const tUserId = BigInt(targetUserId);

    await prisma.businessMember.deleteMany({
      where: { businessId: bizId, userId: tUserId },
    });

    return { success: true };
  }

  /**
   * Đổi Biz mặc định cho user
   */
  public static async switchDefaultBiz(userId: number | bigint, newBizId: string | number) {
    const uId = BigInt(userId);
    const bId = BigInt(newBizId);

    // Verify membership
    const membership = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: bId, userId: uId } },
    });
    if (!membership || !membership.isActive) {
      throw new AppError('Bạn không phải thành viên của doanh nghiệp này', 403, 'NOT_A_MEMBER');
    }

    // Unset all defaults, then set new default
    await prisma.$transaction([
      prisma.businessMember.updateMany({
        where: { userId: uId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.businessMember.update({
        where: { businessId_userId: { businessId: bId, userId: uId } },
        data: { isDefault: true },
      }),
    ]);

    return { success: true, bizId: newBizId.toString() };
  }
}
