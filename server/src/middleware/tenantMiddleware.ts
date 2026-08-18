import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import prisma from '../config/database';

/**
 * Tenant Guard Middleware
 * 
 * Trích xuất và validate bizId từ Request:
 * 1. Ưu tiên Header `X-Biz-Id`
 * 2. Fallback: Biz mặc định của user (isDefault = true trong BusinessMember)
 * 3. Verify user là member hợp lệ của Biz đó
 * 4. Gắn req.bizId, req.bizMembership vào Request context
 */
export const tenantGuard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const userId = BigInt(req.user.userId);
    let bizId: bigint | null = null;

    // 1. Try to get bizId from X-Biz-Id header
    const headerBizId = req.headers['x-biz-id'];
    if (headerBizId && typeof headerBizId === 'string') {
      bizId = BigInt(headerBizId);
    }

    // 2. If no header, try token's defaultBizId
    if (!bizId && req.user.defaultBizId) {
      bizId = BigInt(req.user.defaultBizId);
    }

    // 3. Find and validate membership
    let membership;

    if (bizId) {
      // Validate user belongs to this specific Biz
      membership = await prisma.businessMember.findUnique({
        where: {
          businessId_userId: {
            businessId: bizId,
            userId: userId,
          },
        },
        include: {
          role: { select: { code: true, name: true } },
          business: { select: { id: true, name: true, slug: true, status: true } },
        },
      });
    } else {
      // Fallback: find user's default Biz
      membership = await prisma.businessMember.findFirst({
        where: {
          userId: userId,
          isActive: true,
          isDefault: true,
        },
        include: {
          role: { select: { code: true, name: true } },
          business: { select: { id: true, name: true, slug: true, status: true } },
        },
      });

      // If no default, find any active membership
      if (!membership) {
        membership = await prisma.businessMember.findFirst({
          where: {
            userId: userId,
            isActive: true,
          },
          include: {
            role: { select: { code: true, name: true } },
            business: { select: { id: true, name: true, slug: true, status: true } },
          },
        });
      }
    }

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NO_BUSINESS_ACCESS',
          message: 'Bạn chưa thuộc doanh nghiệp nào hoặc không có quyền truy cập doanh nghiệp này',
        },
      });
    }

    if (!membership.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'MEMBERSHIP_INACTIVE',
          message: 'Tài khoản của bạn đã bị vô hiệu hóa trong doanh nghiệp này',
        },
      });
    }

    if (membership.business.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BUSINESS_INACTIVE',
          message: 'Doanh nghiệp này đã bị tạm ngưng hoạt động',
        },
      });
    }

    // 4. Attach tenant context to request
    req.bizId = membership.businessId;
    req.bizMembership = {
      roleCode: membership.role.code,
      roleName: membership.role.name,
      isActive: membership.isActive,
    };

    next();
  } catch (error: any) {
    // Handle BigInt parse errors gracefully
    if (error.message?.includes('Cannot convert')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_BIZ_ID', message: 'X-Biz-Id header không hợp lệ' },
      });
    }
    next(error);
  }
};
