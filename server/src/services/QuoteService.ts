import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

export interface CreateQuoteDTO {
  opportunityId: string | number;
  validUntil?: string;
  items: Array<{
    productId?: string | number;
    itemDescription: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    taxRate?: number;
  }>;
  userId?: string | number;
}

export class QuoteService {
  public static async getQuotes(bizId: bigint, params: { opportunityId?: string | number }) {
    const where: any = { bizId, deletedAt: null };
    if (params.opportunityId) where.opportunityId = BigInt(params.opportunityId);

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        items: true,
      },
    });

    return quotes.map((q) => ({
      ...q,
      id: q.id.toString(),
      opportunityId: q.opportunityId.toString(),
      items: q.items.map((i) => ({ ...i, id: i.id.toString() })),
    }));
  }

  public static async getQuoteById(bizId: bigint, id: string | number) {
    const quoteId = BigInt(id);
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, bizId, deletedAt: null },
      include: {
        opportunity: true,
        company: true,
        contact: true,
        creator: { select: { firstName: true, lastName: true } },
        items: { include: { product: true } },
      },
    });

    if (!quote) throw new AppError('Quote not found', 404, 'QUOTE_NOT_FOUND');

    return {
      ...quote,
      id: quote.id.toString(),
      opportunityId: quote.opportunityId.toString(),
      items: quote.items.map((i) => ({ ...i, id: i.id.toString() })),
    };
  }

  public static async createQuote(bizId: bigint, dto: CreateQuoteDTO) {
    const oppId = BigInt(dto.opportunityId);
    const opp = await prisma.opportunity.findFirst({ where: { id: oppId, bizId } });
    if (!opp) throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');

    const quoteNumber = `QT-${Date.now()}`;

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const preparedItems = dto.items.map((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discount = item.discountAmount || 0;
      const taxRate = item.taxRate || 0;
      const taxableAmount = itemSubtotal - discount;
      const tax = (taxableAmount * taxRate) / 100;
      const totalPrice = taxableAmount + tax;

      subtotal += itemSubtotal;
      totalDiscount += discount;
      totalTax += tax;

      return {
        productId: item.productId ? BigInt(item.productId) : null,
        itemDescription: item.itemDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: discount,
        taxRate,
        totalPrice,
      };
    });

    const totalAmount = subtotal - totalDiscount + totalTax;

    const quote = await prisma.quote.create({
      data: {
        bizId,
        opportunityId: oppId,
        quoteNumber,
        companyId: opp.companyId,
        contactId: opp.contactId,
        subtotal,
        discountAmount: totalDiscount,
        taxAmount: totalTax,
        totalAmount,
        status: 'DRAFT',
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        createdBy: dto.userId ? BigInt(dto.userId) : null,
        items: {
          create: preparedItems,
        },
      },
      include: { items: true },
    });

    return { ...quote, id: quote.id.toString() };
  }

  public static async updateQuoteStatus(bizId: bigint, id: string | number, status: string) {
    const quoteId = BigInt(id);
    const existing = await prisma.quote.findFirst({ where: { id: quoteId, bizId } });
    if (!existing) throw new AppError('Quote not found', 404, 'QUOTE_NOT_FOUND');

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: { status },
    });
    return { ...updated, id: updated.id.toString() };
  }
}
