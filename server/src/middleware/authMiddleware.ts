import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import prisma from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  bizId?: bigint;
  bizMembership?: {
    roleCode: string;
    roleName: string;
    isActive: boolean;
  };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token required' },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    // Use bizMembership role (per-biz role) if available, fallback to legacy roles
    const currentRole = req.bizMembership?.roleCode;
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    next();
  };
};

export const requireSuperAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user.userId) },
      select: { isSuperAdmin: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt || !user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Yêu cầu quyền Super Admin hệ thống' },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

