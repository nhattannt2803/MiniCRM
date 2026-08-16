import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export interface CreateConversationDTO {
  customerId?: string | number | null;
  leadId?: string | number | null;
  channelType: 'FACEBOOK' | 'ZALO' | 'WEBCHAT' | 'PHONE_CALL' | 'EMAIL';
  channelThreadId?: string | null;
  initialMessage?: string | null;
  senderType?: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  senderId?: string | null;
}

export class ConversationService {
  public static async getConversations(params: {
    customerId?: string | number;
    leadId?: string | number;
    channelType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.customerId) where.customerId = BigInt(params.customerId);
    if (params.leadId) where.leadId = BigInt(params.leadId);
    if (params.channelType) where.channelType = params.channelType;

    const [total, convs] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, customerCode: true, contact: true, company: true } },
          lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          messages: { orderBy: { sentAt: 'desc' }, take: 1 },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return {
      data: convs.map((c) => ({
        ...c,
        id: c.id.toString(),
        customerId: c.customerId?.toString(),
        leadId: c.leadId?.toString(),
        messageCount: c._count.messages,
        lastMessage: c.messages[0] || null,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public static async getConversationById(id: string | number) {
    const convId = BigInt(id);
    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
      include: {
        customer: { include: { contact: true, company: true } },
        lead: true,
        messages: { orderBy: { sentAt: 'asc' } },
      },
    });

    if (!conv) throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');

    return {
      ...conv,
      id: conv.id.toString(),
      customerId: conv.customerId?.toString(),
      leadId: conv.leadId?.toString(),
      messages: conv.messages.map((m) => ({
        ...m,
        id: m.id.toString(),
        conversationId: m.conversationId.toString(),
      })),
    };
  }

  public static async createConversation(dto: CreateConversationDTO) {
    let customerId = dto.customerId ? BigInt(dto.customerId) : null;
    const leadId = dto.leadId ? BigInt(dto.leadId) : null;

    if (!customerId && leadId) {
      const l = await prisma.lead.findUnique({ where: { id: leadId }, select: { customerId: true } });
      if (l?.customerId) customerId = l.customerId;
    }

    const result = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          customerId,
          leadId,
          channelType: dto.channelType,
          channelThreadId: dto.channelThreadId || null,
          status: 'OPEN',
          lastMessageAt: new Date(),
        },
      });

      if (dto.initialMessage) {
        await tx.message.create({
          data: {
            conversationId: conv.id,
            senderType: dto.senderType || 'CUSTOMER',
            senderId: dto.senderId || null,
            content: dto.initialMessage,
          },
        });
      }

      return conv;
    });

    return { ...result, id: result.id.toString() };
  }

  public static async addMessage(
    conversationId: string | number,
    data: { content: string; senderType?: 'CUSTOMER' | 'AGENT' | 'SYSTEM'; senderId?: string }
  ) {
    const convId = BigInt(conversationId);
    const conv = await prisma.conversation.findUnique({ where: { id: convId } });
    if (!conv) throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');

    const msg = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: convId,
          content: data.content,
          senderType: data.senderType || 'AGENT',
          senderId: data.senderId || null,
        },
      });

      await tx.conversation.update({
        where: { id: convId },
        data: { lastMessageAt: new Date() },
      });

      return created;
    });

    return { ...msg, id: msg.id.toString(), conversationId: msg.conversationId.toString() };
  }
}
