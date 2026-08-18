import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class CustomerService {
  public static async getCustomers(bizId: bigint, params: { page?: number; limit?: number; search?: string; entityType?: string; status?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = { bizId, deletedAt: null };
    if (params.entityType) {
      where.entityType = params.entityType;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      where.OR = [
        { customerCode: { contains: params.search } },
        { company: { name: { contains: params.search } } },
        { contact: { firstName: { contains: params.search } } },
        { contact: { lastName: { contains: params.search } } },
        { identities: { some: { identityValue: { contains: params.search } } } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            include: {
              contacts: {
                where: { bizId, deletedAt: null },
              },
            },
          },
          contact: true,
          identities: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { opportunities: true, leads: true } },
        },
      }),
    ]);

    return {
      data: customers.map((c) => ({
        ...c,
        id: c.id.toString(),
        companyId: c.companyId?.toString(),
        contactId: c.contactId?.toString(),
        ownerId: c.ownerId?.toString(),
        opportunityCount: c._count.opportunities,
        leadCount: c._count.leads,
        identities: c.identities.map((i) => ({ ...i, id: i.id.toString(), customerId: i.customerId.toString() })),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public static async getCustomerById(bizId: bigint, id: string | number) {
    const customerId = BigInt(id);
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, bizId, deletedAt: null },
      include: {
        company: { include: { contacts: true } },
        contact: true,
        identities: { orderBy: { createdAt: 'desc' } },
        leads: {
          where: { bizId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: { owner: { select: { id: true, firstName: true, lastName: true } } },
        },
        conversations: {
          where: { bizId },
          orderBy: { updatedAt: 'desc' },
          include: { messages: { orderBy: { sentAt: 'desc' }, take: 1 } },
        },
        owner: { select: { id: true, firstName: true, lastName: true } },
        opportunities: {
          where: { bizId, status: 'WON', deletedAt: null },
          include: { stage: true, products: { include: { product: true } } },
        },
      },
    });

    if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    const relatedType = customer.entityType === 'COMPANY' ? 'COMPANY' : 'CONTACT';
    const relatedId = customer.entityType === 'COMPANY' ? customer.companyId : customer.contactId;

    const [activities, tasks] = await Promise.all([
      relatedId
        ? prisma.activity.findMany({
            where: { bizId, relatedType, relatedId },
            orderBy: { createdAt: 'desc' },
            include: { owner: { select: { firstName: true, lastName: true } } },
          })
        : [],
      relatedId
        ? prisma.task.findMany({
            where: { bizId, relatedType, relatedId },
            orderBy: { dueAt: 'asc' },
            include: { assignee: { select: { firstName: true, lastName: true } } },
          })
        : [],
    ]);

    return {
      ...customer,
      id: customer.id.toString(),
      companyId: customer.companyId?.toString(),
      contactId: customer.contactId?.toString(),
      ownerId: customer.ownerId?.toString(),
      identities: customer.identities.map((i) => ({
        ...i,
        id: i.id.toString(),
        customerId: i.customerId.toString(),
      })),
      leads: customer.leads.map((l) => ({
        ...l,
        id: l.id.toString(),
        customerId: l.customerId?.toString(),
        ownerId: l.ownerId?.toString(),
      })),
      conversations: customer.conversations.map((c) => ({
        ...c,
        id: c.id.toString(),
        customerId: c.customerId?.toString(),
        leadId: c.leadId?.toString(),
      })),
      wonOpportunities: customer.opportunities.map((op) => ({
        ...op,
        id: op.id.toString(),
        stageId: op.stageId.toString(),
      })),
      activities: activities.map((a) => ({ ...a, id: a.id.toString() })),
      tasks: tasks.map((t) => ({ ...t, id: t.id.toString() })),
    };
  }

  public static async createCustomer(bizId: bigint, data: any) {
    const {
      entityType,
      customerCode,
      status = 'ACTIVE',
      ownerId,
      companyName,
      taxCode,
      phone,
      email,
      address,
      firstName,
      lastName,
      contactEmail,
      contactPhone,
      position,
      zaloUid,
      fbPsid,
    } = data;

    if (!entityType || !['COMPANY', 'CONTACT'].includes(entityType)) {
      throw new AppError('entityType must be COMPANY or CONTACT', 400, 'INVALID_ENTITY_TYPE');
    }

    const code = customerCode || `CUST-${Date.now().toString().slice(-6)}`;
    const parsedOwnerId = ownerId ? BigInt(ownerId) : null;

    const result = await prisma.$transaction(async (tx) => {
      let createdCompanyId: bigint | null = null;
      let createdContactId: bigint | null = null;

      if (entityType === 'COMPANY') {
        if (!companyName) {
          throw new AppError('Company name is required', 400, 'COMPANY_NAME_REQUIRED');
        }

        const company = await tx.company.create({
          data: {
            bizId,
            name: companyName,
            taxCode: taxCode || null,
            phone: phone || null,
            email: email || null,
            address: address || null,
            ownerId: parsedOwnerId,
            status: 'CUSTOMER',
            isCustomer: true,
          },
        });
        createdCompanyId = company.id;

        if (firstName || lastName) {
          const contact = await tx.contact.create({
            data: {
              bizId,
              companyId: company.id,
              firstName: firstName || 'N/A',
              lastName: lastName || '',
              email: contactEmail || email || null,
              phone: contactPhone || phone || null,
              position: position || null,
              ownerId: parsedOwnerId,
              isCustomer: true,
            },
          });
          createdContactId = contact.id;
        }
      } else {
        if (!firstName) {
          throw new AppError('First name is required for contact', 400, 'FIRST_NAME_REQUIRED');
        }

        const contact = await tx.contact.create({
          data: {
            bizId,
            firstName: firstName,
            lastName: lastName || '',
            email: email || contactEmail || null,
            phone: phone || contactPhone || null,
            position: position || null,
            ownerId: parsedOwnerId,
            isCustomer: true,
          },
        });
        createdContactId = contact.id;
      }

      const customer = await tx.customer.create({
        data: {
          bizId,
          customerCode: code,
          entityType,
          companyId: createdCompanyId,
          contactId: createdContactId,
          ownerId: parsedOwnerId,
          status: status || 'ACTIVE',
        },
        include: {
          company: true,
          contact: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Automatically create CustomerIdentities
      const effectivePhone = phone || contactPhone;
      const effectiveEmail = email || contactEmail;

      if (effectivePhone && effectivePhone.trim()) {
        await tx.customerIdentity.upsert({
          where: { customerId_type_identityValue: { customerId: customer.id, type: 'PHONE', identityValue: effectivePhone.trim() } },
          update: { status: 'ACTIVE' },
          create: { customerId: customer.id, type: 'PHONE', identityValue: effectivePhone.trim(), isVerified: true },
        });
      }

      if (effectiveEmail && effectiveEmail.trim()) {
        await tx.customerIdentity.upsert({
          where: { customerId_type_identityValue: { customerId: customer.id, type: 'EMAIL', identityValue: effectiveEmail.trim().toLowerCase() } },
          update: { status: 'ACTIVE' },
          create: { customerId: customer.id, type: 'EMAIL', identityValue: effectiveEmail.trim().toLowerCase(), isVerified: true },
        });
      }

      if (zaloUid && zaloUid.trim()) {
        await tx.customerIdentity.upsert({
          where: { customerId_type_identityValue: { customerId: customer.id, type: 'ZALO_UID', identityValue: zaloUid.trim() } },
          update: { status: 'ACTIVE' },
          create: { customerId: customer.id, type: 'ZALO_UID', identityValue: zaloUid.trim(), isVerified: true },
        });
      }

      if (fbPsid && fbPsid.trim()) {
        await tx.customerIdentity.upsert({
          where: { customerId_type_identityValue: { customerId: customer.id, type: 'FB_PSID', identityValue: fbPsid.trim() } },
          update: { status: 'ACTIVE' },
          create: { customerId: customer.id, type: 'FB_PSID', identityValue: fbPsid.trim(), isVerified: true },
        });
      }

      return customer;
    });

    return {
      ...result,
      id: result.id.toString(),
      companyId: result.companyId?.toString(),
      contactId: result.contactId?.toString(),
      ownerId: result.ownerId?.toString(),
    };
  }

  public static async updateCustomer(bizId: bigint, id: string | number, data: any) {
    const customerId = BigInt(id);
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, bizId, deletedAt: null },
      include: { company: true, contact: true },
    });
    if (!existing) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    const newOwnerId = data.ownerId !== undefined ? (data.ownerId ? BigInt(data.ownerId) : null) : existing.ownerId;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          customerCode: data.customerCode !== undefined ? data.customerCode : existing.customerCode,
          status: data.status !== undefined ? data.status : existing.status,
          ownerId: newOwnerId,
        },
        include: {
          company: true,
          contact: true,
          identities: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (existing.companyId) {
        const companyData: any = {};
        if (data.companyName !== undefined) companyData.name = data.companyName;
        if (data.taxCode !== undefined) companyData.taxCode = data.taxCode;
        if (data.phone !== undefined) companyData.phone = data.phone;
        if (data.email !== undefined) companyData.email = data.email;
        if (data.address !== undefined) companyData.address = data.address;
        if (data.ownerId !== undefined) companyData.ownerId = newOwnerId;

        if (Object.keys(companyData).length > 0) {
          await tx.company.update({
            where: { id: existing.companyId },
            data: companyData,
          });
        }
      }

      if (existing.contactId) {
        const contactData: any = {};
        if (data.firstName !== undefined) contactData.firstName = data.firstName;
        if (data.lastName !== undefined) contactData.lastName = data.lastName;
        if (data.contactEmail !== undefined) contactData.email = data.contactEmail;
        else if (data.email !== undefined && existing.entityType === 'CONTACT') contactData.email = data.email;
        if (data.contactPhone !== undefined) contactData.phone = data.contactPhone;
        else if (data.phone !== undefined && existing.entityType === 'CONTACT') contactData.phone = data.phone;
        if (data.position !== undefined) contactData.position = data.position;
        if (data.ownerId !== undefined) contactData.ownerId = newOwnerId;

        if (Object.keys(contactData).length > 0) {
          await tx.contact.update({
            where: { id: existing.contactId },
            data: contactData,
          });
        }
      }

      return updatedCustomer;
    });

    return {
      ...updated,
      id: updated.id.toString(),
      companyId: updated.companyId?.toString(),
      contactId: updated.contactId?.toString(),
      ownerId: updated.ownerId?.toString(),
      identities: updated.identities.map((i) => ({ ...i, id: i.id.toString(), customerId: i.customerId.toString() })),
    };
  }

  public static async deleteCustomer(bizId: bigint, id: string | number) {
    const customerId = BigInt(id);
    const existing = await prisma.customer.findFirst({ where: { id: customerId, bizId, deletedAt: null } });
    if (!existing) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    await prisma.customer.update({
      where: { id: customerId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
