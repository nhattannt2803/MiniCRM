import { PrismaClient } from '@prisma/client';

// Polyfill BigInt to JSON string to prevent TypeError: Do not know how to serialize a BigInt
(BigInt.prototype as any).toJSON = function () {
  return Number(this.toString());
};

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
