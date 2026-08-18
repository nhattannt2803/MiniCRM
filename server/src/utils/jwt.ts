import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'minicrm_super_secret_jwt_key_2026';

export interface TokenPayload {
  userId: number;
  email: string;
  defaultBizId?: number; // Biz mặc định (fast-path, tránh query DB mỗi request)
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
