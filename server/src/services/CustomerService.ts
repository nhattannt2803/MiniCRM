import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export class CustomerService {
  public static async getCustomers(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (params.search) {
      where.OR = [
        { customerCode: { contains: params.search } },
        { company: { name: { contains: params.search } } },
        { contact: { firstName: { contains: params.search } } },
        { contact: { lastName: { contains: params.search } } },
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
          company: true,
          contact: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { opportunities: true } },
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
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public static async getCustomerById(id: string | number) {
    const customerId = BigInt(id);
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      include: {
        company: { include: { contacts: true } },
        contact: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
        opportunities: {
          where: { status: 'WON', deletedAt: null },
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
            where: { relatedType, relatedId },
            orderBy: { createdAt: 'desc' },
            include: { owner: { select: { firstName: true, lastName: true } } },
          })
        : [],
      relatedId
        ? prisma.task.findMany({
            where: { relatedType, relatedId },
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
      wonOpportunities: customer.opportunities.map((op) => ({
        ...op,
        id: op.id.toString(),
        stageId: op.stageId.toString(),
      })),
      activities: activities.map((a) => ({ ...a, id: a.id.toString() })),
      tasks: tasks.map((t) => ({ ...t, id: t.id.toString() })),
    };
  }
}
