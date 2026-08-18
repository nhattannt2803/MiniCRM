import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class ContactService {
  public static async getContacts(bizId: bigint, params: {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string | number;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = { bizId, deletedAt: null };
    if (params.companyId) where.companyId = BigInt(params.companyId);

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
        { email: { contains: params.search } },
        { phone: { contains: params.search } },
      ];
    }

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      data: contacts.map((c) => ({
        ...c,
        id: c.id.toString(),
        companyId: c.companyId?.toString(),
        ownerId: c.ownerId?.toString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public static async getContactById(bizId: bigint, id: string | number) {
    const contactId = BigInt(id);
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, bizId, deletedAt: null },
      include: {
        company: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!contact) throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');

    return {
      ...contact,
      id: contact.id.toString(),
      companyId: contact.companyId?.toString(),
      ownerId: contact.ownerId?.toString(),
    };
  }

  public static async createContact(bizId: bigint, data: any) {
    const created = await prisma.contact.create({
      data: {
        bizId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position || null,
        department: data.department || null,
        isPrimary: data.isPrimary || false,
        companyId: data.companyId ? BigInt(data.companyId) : null,
        ownerId: data.ownerId ? BigInt(data.ownerId) : null,
      },
    });
    return { ...created, id: created.id.toString() };
  }

  public static async updateContact(bizId: bigint, id: string | number, data: any) {
    const contactId = BigInt(id);
    const existing = await prisma.contact.findFirst({ where: { id: contactId, bizId, deletedAt: null } });
    if (!existing) throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        position: data.position,
        department: data.department,
        isPrimary: data.isPrimary,
        companyId: data.companyId ? BigInt(data.companyId) : undefined,
        ownerId: data.ownerId ? BigInt(data.ownerId) : undefined,
      },
    });
    return { ...updated, id: updated.id.toString() };
  }
}
