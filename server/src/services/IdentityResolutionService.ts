import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';

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
  matchedIdentities?: any[];
  reason?: string;
}

export class IdentityResolutionService {
  /**
   * Resolve incoming identity against existing customer identities and contacts
   */
  public static async resolveIdentity(input: IdentityLookupInput): Promise<IdentityResolutionResult> {
    const { phone, email, fbPsid, zaloUid, webVisitorId, name } = input;

    // 1. Check direct Identity Table match (Exact match on FB PSID / Zalo UID / Web Visitor)
    if (fbPsid) {
      const fbIdent = await prisma.customerIdentity.findUnique({
        where: { type_identityValue: { type: 'FB_PSID', identityValue: fbPsid } },
        include: { customer: { include: { company: true, contact: true } } },
      });
      if (fbIdent && fbIdent.customer && !fbIdent.customer.deletedAt) {
        return {
          status: 'MATCHED',
          matchedCustomerId: fbIdent.customerId.toString(),
          matchedCustomerCode: fbIdent.customer.customerCode,
          matchedCustomerName: this.getCustomerName(fbIdent.customer),
          reason: 'Matched Facebook PSID identity',
        };
      }
    }

    if (zaloUid) {
      const zaloIdent = await prisma.customerIdentity.findUnique({
        where: { type_identityValue: { type: 'ZALO_UID', identityValue: zaloUid } },
        include: { customer: { include: { company: true, contact: true } } },
      });
      if (zaloIdent && zaloIdent.customer && !zaloIdent.customer.deletedAt) {
        return {
          status: 'MATCHED',
          matchedCustomerId: zaloIdent.customerId.toString(),
          matchedCustomerCode: zaloIdent.customer.customerCode,
          matchedCustomerName: this.getCustomerName(zaloIdent.customer),
          reason: 'Matched Zalo UID identity',
        };
      }
    }

    if (webVisitorId) {
      const webIdent = await prisma.customerIdentity.findUnique({
        where: { type_identityValue: { type: 'WEB_VISITOR', identityValue: webVisitorId } },
        include: { customer: { include: { company: true, contact: true } } },
      });
      if (webIdent && webIdent.customer && !webIdent.customer.deletedAt) {
        return {
          status: 'MATCHED',
          matchedCustomerId: webIdent.customerId.toString(),
          matchedCustomerCode: webIdent.customer.customerCode,
          matchedCustomerName: this.getCustomerName(webIdent.customer),
          reason: 'Matched Web Visitor identity',
        };
      }
    }

    // 2. Check Phone in CustomerIdentities & Contacts
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim();

      // Check CustomerIdentity table for Phone
      const phoneIdent = await prisma.customerIdentity.findFirst({
        where: { type: 'PHONE', identityValue: cleanPhone },
        include: { customer: { include: { company: true, contact: true } } },
      });

      let foundCustomer: any = phoneIdent?.customer || null;

      // If not in CustomerIdentity, check contacts
      if (!foundCustomer) {
        const contactMatch = await prisma.contact.findFirst({
          where: { phone: cleanPhone, deletedAt: null },
          include: { customers: { where: { deletedAt: null } } },
        });
        if (contactMatch && contactMatch.customers.length > 0) {
          foundCustomer = await prisma.customer.findFirst({
            where: { id: contactMatch.customers[0].id, deletedAt: null },
            include: { company: true, contact: true },
          });
        }
      }

      if (foundCustomer && !foundCustomer.deletedAt) {
        const customerName = this.getCustomerName(foundCustomer);

        // Verify if name matches or differs
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
          reason: `Matched phone number (${cleanPhone})`,
        };
      }
    }

    // 3. Check Email
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();

      const emailIdent = await prisma.customerIdentity.findFirst({
        where: { type: 'EMAIL', identityValue: cleanEmail },
        include: { customer: { include: { company: true, contact: true } } },
      });

      let foundCustomer: any = emailIdent?.customer || null;

      if (!foundCustomer) {
        const contactMatch = await prisma.contact.findFirst({
          where: { email: cleanEmail, deletedAt: null },
          include: { customers: { where: { deletedAt: null } } },
        });
        if (contactMatch && contactMatch.customers.length > 0) {
          foundCustomer = await prisma.customer.findFirst({
            where: { id: contactMatch.customers[0].id, deletedAt: null },
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
  public static async addIdentityToCustomer(customerId: string | number, type: string, identityValue: string) {
    const custId = BigInt(customerId);
    const customer = await prisma.customer.findFirst({ where: { id: custId, deletedAt: null } });
    if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    const cleanValue = identityValue.trim();
    if (!cleanValue) throw new AppError('Identity value cannot be empty', 400, 'INVALID_IDENTITY');

    // Upsert identity
    const identity = await prisma.customerIdentity.upsert({
      where: { type_identityValue: { type, identityValue: cleanValue } },
      update: { customerId: custId, status: 'ACTIVE' },
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
  public static async getCustomerIdentities(customerId: string | number) {
    const custId = BigInt(customerId);
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
    leadId: string | number,
    action: 'ATTACH_TO_EXISTING' | 'CREATE_SEPARATE_CUSTOMER',
    targetCustomerId?: string | number
  ) {
    const lId = BigInt(leadId);
    const lead = await prisma.lead.findFirst({ where: { id: lId, deletedAt: null } });
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

        // Add phone & email identities to customer if present on lead
        if (lead.phone) {
          await tx.customerIdentity.upsert({
            where: { type_identityValue: { type: 'PHONE', identityValue: lead.phone.trim() } },
            update: { customerId: custId },
            create: { customerId: custId, type: 'PHONE', identityValue: lead.phone.trim(), isVerified: true },
          });
        }
        if (lead.email) {
          await tx.customerIdentity.upsert({
            where: { type_identityValue: { type: 'EMAIL', identityValue: lead.email.trim().toLowerCase() } },
            update: { customerId: custId },
            create: { customerId: custId, type: 'EMAIL', identityValue: lead.email.trim().toLowerCase(), isVerified: true },
          });
        }
      });
    } else {
      // CREATE SEPARATE CUSTOMER
      await prisma.$transaction(async (tx) => {
        const contact = await tx.contact.create({
          data: {
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

        if (lead.phone) {
          await tx.customerIdentity.create({
            data: { customerId: customer.id, type: 'PHONE', identityValue: lead.phone.trim(), isVerified: true },
          });
        }
        if (lead.email) {
          await tx.customerIdentity.create({
            data: { customerId: customer.id, type: 'EMAIL', identityValue: lead.email.trim().toLowerCase(), isVerified: true },
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
