import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';
import { parseFbPsidInput, parseZaloUidInput } from '../utils/identityHelper';

export interface IdentityLookupInput {
  phone?: string | null;
  email?: string | null;
  fbPsid?: string | null;
  zaloUid?: string | null;
  webVisitorId?: string | null;
  name?: string | null;
}

export interface IdentityResolutionResult {
  status: 'MATCHED' | 'POTENTIAL_DUPLICATE' | 'NEW_CUSTOMER';
  matchedCustomerId?: string;
  matchedCustomerCode?: string;
  matchedCustomerName?: string;
  matchedFirstName?: string;
  matchedLastName?: string;
  matchedCompanyName?: string;
  matchedIdentities?: any[];
  reason?: string;
}

export class IdentityResolutionService {
  /**
   * Resolve incoming identity against existing customer identities and contacts within a Biz
   */
  public static async resolveIdentity(bizId: bigint, input: IdentityLookupInput): Promise<IdentityResolutionResult> {
    const { phone, email, fbPsid, zaloUid, webVisitorId, name } = input;

    // 1. Check direct Identity Table match (Exact match on FB PSID / Zalo UID / Web Visitor)
    const parsedFb = parseFbPsidInput(fbPsid);
    if (parsedFb) {
      const cleanFb = parsedFb;
      const fbIdent = await prisma.customerIdentity.findFirst({
        where: { type: 'FB_PSID', identityValue: cleanFb, customer: { bizId } },
        include: { customer: { include: { company: true, contact: true } } },
      });
      if (fbIdent && fbIdent.customer && !fbIdent.customer.deletedAt) {
        const customerName = this.getCustomerName(fbIdent.customer);
        return {
          status: 'MATCHED',
          matchedCustomerId: fbIdent.customerId.toString(),
          matchedCustomerCode: fbIdent.customer.customerCode,
          matchedCustomerName: customerName,
          matchedFirstName: fbIdent.customer.contact?.firstName || '',
          matchedLastName: fbIdent.customer.contact?.lastName || '',
          matchedCompanyName: fbIdent.customer.company?.name || '',
          reason: `Matched Facebook PSID identity (${cleanFb})`,
        };
      }
    }

    const parsedZalo = parseZaloUidInput(zaloUid);
    if (parsedZalo) {
      const cleanZalo = parsedZalo;
      const zaloIdent = await prisma.customerIdentity.findFirst({
        where: { type: 'ZALO_UID', identityValue: cleanZalo, customer: { bizId } },
        include: { customer: { include: { company: true, contact: true } } },
      });
      if (zaloIdent && zaloIdent.customer && !zaloIdent.customer.deletedAt) {
        const customerName = this.getCustomerName(zaloIdent.customer);
        return {
          status: 'MATCHED',
          matchedCustomerId: zaloIdent.customerId.toString(),
          matchedCustomerCode: zaloIdent.customer.customerCode,
          matchedCustomerName: customerName,
          matchedFirstName: zaloIdent.customer.contact?.firstName || '',
          matchedLastName: zaloIdent.customer.contact?.lastName || '',
          matchedCompanyName: zaloIdent.customer.company?.name || '',
          reason: `Matched Zalo UID identity (${cleanZalo})`,
        };
      }
    }

    if (webVisitorId && webVisitorId.trim()) {
      const cleanWeb = webVisitorId.trim();
      const webIdent = await prisma.customerIdentity.findFirst({
        where: { type: 'WEB_VISITOR', identityValue: cleanWeb, customer: { bizId } },
        include: { customer: { include: { company: true, contact: true } } },
      });
      if (webIdent && webIdent.customer && !webIdent.customer.deletedAt) {
        const customerName = this.getCustomerName(webIdent.customer);
        return {
          status: 'MATCHED',
          matchedCustomerId: webIdent.customerId.toString(),
          matchedCustomerCode: webIdent.customer.customerCode,
          matchedCustomerName: customerName,
          matchedFirstName: webIdent.customer.contact?.firstName || '',
          matchedLastName: webIdent.customer.contact?.lastName || '',
          matchedCompanyName: webIdent.customer.company?.name || '',
          reason: `Matched Web Visitor identity (${cleanWeb})`,
        };
      }
    }

    // 2. Check Phone in CustomerIdentities & Contacts within biz
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim();

      const phoneIdent = await prisma.customerIdentity.findFirst({
        where: { type: 'PHONE', identityValue: cleanPhone, customer: { bizId } },
        include: { customer: { include: { company: true, contact: true } } },
      });

      let foundCustomer: any = phoneIdent?.customer || null;

      if (!foundCustomer) {
        const contactMatch = await prisma.contact.findFirst({
          where: { bizId, phone: cleanPhone, deletedAt: null },
          include: { customers: { where: { bizId, deletedAt: null } } },
        });
        if (contactMatch && contactMatch.customers.length > 0) {
          foundCustomer = await prisma.customer.findFirst({
            where: { id: contactMatch.customers[0].id, bizId, deletedAt: null },
            include: { company: true, contact: true },
          });
        }
      }

      if (foundCustomer && !foundCustomer.deletedAt) {
        const customerName = this.getCustomerName(foundCustomer);

        if (name && name.trim()) {
          const isNameSimilar = this.compareNames(name, customerName);
          if (!isNameSimilar) {
            return {
              status: 'POTENTIAL_DUPLICATE',
              matchedCustomerId: foundCustomer.id.toString(),
              matchedCustomerCode: foundCustomer.customerCode,
              matchedCustomerName: customerName,
              reason: `Phone matched (${cleanPhone}) but name differs ('${name}' vs '${customerName}')`,
            };
          }
        }

        return {
          status: 'MATCHED',
          matchedCustomerId: foundCustomer.id.toString(),
          matchedCustomerCode: foundCustomer.customerCode,
          matchedCustomerName: customerName,
          matchedFirstName: foundCustomer.contact?.firstName || '',
          matchedLastName: foundCustomer.contact?.lastName || '',
          matchedCompanyName: foundCustomer.company?.name || '',
          reason: `Matched phone number (${cleanPhone})`,
        };
      }
    }

    // 3. Check Email within biz
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();

      const emailIdent = await prisma.customerIdentity.findFirst({
        where: { type: 'EMAIL', identityValue: cleanEmail, customer: { bizId } },
        include: { customer: { include: { company: true, contact: true } } },
      });

      let foundCustomer: any = emailIdent?.customer || null;

      if (!foundCustomer) {
        const contactMatch = await prisma.contact.findFirst({
          where: { bizId, email: cleanEmail, deletedAt: null },
          include: { customers: { where: { bizId, deletedAt: null } } },
        });
        if (contactMatch && contactMatch.customers.length > 0) {
          foundCustomer = await prisma.customer.findFirst({
            where: { id: contactMatch.customers[0].id, bizId, deletedAt: null },
            include: { company: true, contact: true },
          });
        }
      }

      if (foundCustomer && !foundCustomer.deletedAt) {
        const customerName = this.getCustomerName(foundCustomer);
        return {
          status: 'MATCHED',
          matchedCustomerId: foundCustomer.id.toString(),
          matchedCustomerCode: foundCustomer.customerCode,
          matchedCustomerName: customerName,
          matchedFirstName: foundCustomer.contact?.firstName || '',
          matchedLastName: foundCustomer.contact?.lastName || '',
          matchedCompanyName: foundCustomer.company?.name || '',
          reason: `Matched email address (${cleanEmail})`,
        };
      }
    }

    return {
      status: 'NEW_CUSTOMER',
      reason: 'No matching identity found in CRM',
    };
  }

  /**
   * Add identity to existing Customer
   */
  public static async addIdentityToCustomer(bizId: bigint, customerId: string | number, type: string, identityValue: string) {
    const custId = BigInt(customerId);
    const customer = await prisma.customer.findFirst({ where: { id: custId, bizId, deletedAt: null } });
    if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    const cleanValue = identityValue.trim();
    if (!cleanValue) throw new AppError('Identity value cannot be empty', 400, 'INVALID_IDENTITY');

    // Upsert identity
    const identity = await prisma.customerIdentity.upsert({
      where: { customerId_type_identityValue: { customerId: custId, type, identityValue: cleanValue } },
      update: { status: 'ACTIVE' },
      create: {
        customerId: custId,
        type,
        identityValue: cleanValue,
        isVerified: true,
        status: 'ACTIVE',
      },
    });

    return { ...identity, id: identity.id.toString(), customerId: identity.customerId.toString() };
  }

  /**
   * Get all identities of a customer
   */
  public static async getCustomerIdentities(bizId: bigint, customerId: string | number) {
    const custId = BigInt(customerId);
    const customer = await prisma.customer.findFirst({ where: { id: custId, bizId, deletedAt: null } });
    if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    const identities = await prisma.customerIdentity.findMany({
      where: { customerId: custId },
      orderBy: { createdAt: 'desc' },
    });
    return identities.map((i) => ({
      ...i,
      id: i.id.toString(),
      customerId: i.customerId.toString(),
    }));
  }

  /**
   * Resolve a Lead with POTENTIAL_DUPLICATE status
   */
  public static async resolveDuplicateLead(
    bizId: bigint,
    leadId: string | number,
    action: 'ATTACH_TO_EXISTING' | 'CREATE_SEPARATE_CUSTOMER',
    targetCustomerId?: string | number
  ) {
    const lId = BigInt(leadId);
    const lead = await prisma.lead.findFirst({ where: { id: lId, bizId, deletedAt: null } });
    if (!lead) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');

    if (action === 'ATTACH_TO_EXISTING') {
      if (!targetCustomerId) {
        throw new AppError('targetCustomerId is required for ATTACH_TO_EXISTING', 400, 'TARGET_CUSTOMER_REQUIRED');
      }
      const custId = BigInt(targetCustomerId);

      await prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: lId },
          data: {
            customerId: custId,
            identityResolutionStatus: 'MATCHED',
          },
        });

        if (lead.phone && lead.phone.trim()) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: custId, type: 'PHONE', identityValue: lead.phone.trim() } },
            update: { status: 'ACTIVE' },
            create: { customerId: custId, type: 'PHONE', identityValue: lead.phone.trim(), isVerified: true },
          });
        }
        if (lead.email && lead.email.trim()) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: custId, type: 'EMAIL', identityValue: lead.email.trim().toLowerCase() } },
            update: { status: 'ACTIVE' },
            create: { customerId: custId, type: 'EMAIL', identityValue: lead.email.trim().toLowerCase(), isVerified: true },
          });
        }
      });
    } else {
      // CREATE SEPARATE CUSTOMER
      await prisma.$transaction(async (tx) => {
        const contact = await tx.contact.create({
          data: {
            bizId,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email || null,
            phone: lead.phone || null,
            ownerId: lead.ownerId,
            isCustomer: true,
          },
        });

        const customer = await tx.customer.create({
          data: {
            bizId,
            customerCode: `CUST-${Date.now().toString().slice(-6)}`,
            entityType: 'CONTACT',
            contactId: contact.id,
            ownerId: lead.ownerId,
            status: 'ACTIVE',
          },
        });

        await tx.lead.update({
          where: { id: lId },
          data: {
            customerId: customer.id,
            contactId: contact.id,
            identityResolutionStatus: 'MATCHED',
          },
        });

        if (lead.phone && lead.phone.trim()) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: customer.id, type: 'PHONE', identityValue: lead.phone.trim() } },
            update: { status: 'ACTIVE' },
            create: { customerId: customer.id, type: 'PHONE', identityValue: lead.phone.trim(), isVerified: true },
          });
        }
        if (lead.email && lead.email.trim()) {
          await tx.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: customer.id, type: 'EMAIL', identityValue: lead.email.trim().toLowerCase() } },
            update: { status: 'ACTIVE' },
            create: { customerId: customer.id, type: 'EMAIL', identityValue: lead.email.trim().toLowerCase(), isVerified: true },
          });
        }
      });
    }

    return { success: true, leadId: leadId.toString() };
  }

  private static getCustomerName(customer: any): string {
    if (customer?.company?.name) return customer.company.name;
    if (customer?.contact) return `${customer.contact.lastName || ''} ${customer.contact.firstName || ''}`.trim();
    return customer?.customerCode || 'Unknown Customer';
  }

  private static compareNames(name1: string, name2: string): boolean {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    return n1.includes(n2) || n2.includes(n1) || n1 === n2;
  }
}
