import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class CompanyService {
  public static async getCompanies(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    isCustomer?: boolean;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.isCustomer !== undefined) where.isCustomer = params.isCustomer;

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { taxCode: { contains: params.search } },
        { email: { contains: params.search } },
        { phone: { contains: params.search } },
      ];
    }

    const [total, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { contacts: true, opportunities: true } },
        },
      }),
    ]);

    return {
      data: companies.map((c) => ({
        ...c,
        id: c.id.toString(),
        ownerId: c.ownerId?.toString(),
        contactCount: c._count.contacts,
        opportunityCount: c._count.opportunities,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public static async getCompanyById(id: string | number) {
    const companyId = BigInt(id);
    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        contacts: { where: { deletedAt: null } },
        opportunities: {
          where: { deletedAt: null },
          include: { stage: true },
        },
      },
    });

    if (!company) throw new AppError('Company not found', 404, 'COMPANY_NOT_FOUND');

    const [activities, tasks] = await Promise.all([
      prisma.activity.findMany({
        where: { relatedType: 'COMPANY', relatedId: companyId },
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { firstName: true, lastName: true } } },
      }),
      prisma.task.findMany({
        where: { relatedType: 'COMPANY', relatedId: companyId },
        orderBy: { dueAt: 'asc' },
        include: { assignee: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    return {
      ...company,
      id: company.id.toString(),
      ownerId: company.ownerId?.toString(),
      contacts: company.contacts.map((ct) => ({ ...ct, id: ct.id.toString(), companyId: ct.companyId?.toString() })),
      opportunities: company.opportunities.map((op) => ({ ...op, id: op.id.toString(), stageId: op.stageId.toString() })),
      activities: activities.map((a) => ({ ...a, id: a.id.toString() })),
      tasks: tasks.map((t) => ({ ...t, id: t.id.toString() })),
    };
  }

  public static async createCompany(data: any) {
    const created = await prisma.company.create({
      data: {
        name: data.name,
        taxCode: data.taxCode || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        address: data.address || null,
        ownerId: data.ownerId ? BigInt(data.ownerId) : null,
        status: data.status || 'PROSPECT',
      },
    });
    return { ...created, id: created.id.toString() };
  }

  public static async updateCompany(id: string | number, data: any) {
    const companyId = BigInt(id);
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: data.name,
        taxCode: data.taxCode,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        status: data.status,
        ownerId: data.ownerId ? BigInt(data.ownerId) : undefined,
      },
    });
    return { ...updated, id: updated.id.toString() };
  }

  public static async addContact(companyId: string | number, data: any) {
    const compId = BigInt(companyId);
    const company = await prisma.company.findFirst({ where: { id: compId, deletedAt: null } });
    if (!company) throw new AppError('Company not found', 404, 'COMPANY_NOT_FOUND');

    const isPrimary = Boolean(data.isPrimary);

    return await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        // Reset existing contacts to secondary
        await tx.contact.updateMany({
          where: { companyId: compId },
          data: { isPrimary: false },
        });
      }

      const newContact = await tx.contact.create({
        data: {
          companyId: compId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone || null,
          position: data.position || null,
          department: data.department || null,
          isPrimary,
          isCustomer: company.isCustomer,
          ownerId: company.ownerId,
        },
      });

      // Find associated Customer profile for this company
      const linkedCustomer = await tx.customer.findFirst({
        where: { companyId: compId, entityType: 'COMPANY', deletedAt: null },
      });

      if (linkedCustomer) {
        if (isPrimary) {
          await tx.customer.update({
            where: { id: linkedCustomer.id },
            data: { contactId: newContact.id },
          });
        }

        // Add contact phone & email as CustomerIdentities
        if (data.phone && data.phone.trim()) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: linkedCustomer.id, type: 'PHONE', identityValue: data.phone.trim() } },
            update: { status: 'ACTIVE' },
            create: { customerId: linkedCustomer.id, type: 'PHONE', identityValue: data.phone.trim(), isVerified: true },
          });
        }
        if (data.email && data.email.trim()) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: linkedCustomer.id, type: 'EMAIL', identityValue: data.email.trim().toLowerCase() } },
            update: { status: 'ACTIVE' },
            create: { customerId: linkedCustomer.id, type: 'EMAIL', identityValue: data.email.trim().toLowerCase(), isVerified: true },
          });
        }
      }

      return {
        ...newContact,
        id: newContact.id.toString(),
        companyId: compId.toString(),
      };
    });
  }

  public static async setPrimaryContact(companyId: string | number, contactId: string | number) {
    const compId = BigInt(companyId);
    const ctId = BigInt(contactId);

    return await prisma.$transaction(async (tx) => {
      await tx.contact.updateMany({
        where: { companyId: compId },
        data: { isPrimary: false },
      });

      const updated = await tx.contact.update({
        where: { id: ctId },
        data: { isPrimary: true },
      });

      // Update linked customer's primary contactId
      const linkedCustomer = await tx.customer.findFirst({
        where: { companyId: compId, entityType: 'COMPANY', deletedAt: null },
      });

      if (linkedCustomer) {
        await tx.customer.update({
          where: { id: linkedCustomer.id },
          data: { contactId: ctId },
        });
      }

      return {
        ...updated,
        id: updated.id.toString(),
        companyId: compId.toString(),
      };
    });
  }
}
