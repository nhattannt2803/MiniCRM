import prisma from '../config/database';
import { publishOutboxEvent } from '../events/outboxPublisher';
import { AppError } from '../middleware/errorMiddleware';

export interface ConvertLeadDTO {
  leadId: string | number;
  companyMode: 'CREATE' | 'EXISTING' | 'NONE';
  existingCompanyId?: string | number;
  newCompanyName?: string;
  taxCode?: string;

  contactMode: 'CREATE' | 'EXISTING' | 'NONE';
  existingContactId?: string | number;
  newContactFirstName?: string;
  newContactLastName?: string;
  newContactEmail?: string;
  newContactPhone?: string;

  createOpportunity: boolean;
  opportunityName?: string;
  opportunityAmount?: number;
  pipelineId?: string | number;
  stageId?: string | number;
  productIds?: (string | number)[];
}

export class LeadConversionService {
  public static async convertLead(bizId: bigint, dto: ConvertLeadDTO) {
    const leadId = BigInt(dto.leadId);

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, bizId, deletedAt: null },
    });

    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }

    if (lead.status === 'CONVERTED') {
      throw new AppError('Lead is already converted', 400, 'LEAD_ALREADY_CONVERTED');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Resolve Company
      let companyId: bigint | null = null;

      if (dto.companyMode === 'EXISTING' && dto.existingCompanyId) {
        companyId = BigInt(dto.existingCompanyId);
      } else if (dto.companyMode === 'CREATE') {
        const companyName = dto.newCompanyName || lead.companyName || `${lead.firstName} ${lead.lastName} Co.`;
        // Check duplicate by name or tax code
        let existingCo = await tx.company.findFirst({
          where: {
            bizId,
            deletedAt: null,
            OR: [
              { name: companyName },
              dto.taxCode ? { taxCode: dto.taxCode } : {},
            ],
          },
        });

        if (existingCo) {
          companyId = existingCo.id;
        } else {
          const newCo = await tx.company.create({
            data: {
              bizId,
              name: companyName,
              taxCode: dto.taxCode || null,
              email: lead.email || null,
              phone: lead.phone || null,
              ownerId: lead.ownerId,
              status: 'PROSPECT',
            },
          });
          companyId = newCo.id;
        }
      } else if (lead.companyId) {
        companyId = lead.companyId;
      }

      // 2. Resolve Contact
      let contactId: bigint | null = null;

      if (dto.contactMode === 'EXISTING' && dto.existingContactId) {
        contactId = BigInt(dto.existingContactId);
      } else if (dto.contactMode === 'CREATE') {
        const email = dto.newContactEmail || lead.email;
        // Check duplicate by email
        let existingContact = email
          ? await tx.contact.findFirst({ where: { bizId, email, deletedAt: null } })
          : null;

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const newCt = await tx.contact.create({
            data: {
              bizId,
              companyId,
              firstName: dto.newContactFirstName || lead.firstName,
              lastName: dto.newContactLastName || lead.lastName,
              email: lead.email || null,
              phone: lead.phone || null,
              position: lead.jobTitle || null,
              ownerId: lead.ownerId,
            },
          });
          contactId = newCt.id;
        }
      } else if (lead.contactId) {
        contactId = lead.contactId;
      }

      // 3. Create Opportunity (if requested)
      let createdOpportunityId: bigint | null = null;

      if (dto.createOpportunity) {
        let pipelineId: bigint;
        let stageId: bigint;

        if (dto.pipelineId && dto.stageId) {
          pipelineId = BigInt(dto.pipelineId);
          stageId = BigInt(dto.stageId);
        } else {
          const defaultPipeline = await tx.pipeline.findFirst({
            where: { bizId, isDefault: true },
            include: { stages: { orderBy: { orderNo: 'asc' } } },
          });
          if (!defaultPipeline || defaultPipeline.stages.length === 0) {
            throw new AppError('Default sales pipeline not configured', 500, 'PIPELINE_NOT_FOUND');
          }
          pipelineId = defaultPipeline.id;
          stageId = defaultPipeline.stages[0].id;
        }

        const oppName = dto.opportunityName || `Deal - ${lead.firstName} ${lead.lastName}`;
        const oppAmount = dto.opportunityAmount !== undefined ? dto.opportunityAmount : 0;

        const opp = await tx.opportunity.create({
          data: {
            bizId,
            name: oppName,
            companyId,
            contactId,
            customerId: lead.customerId,
            leadId: lead.id,
            ownerId: lead.ownerId,
            pipelineId,
            stageId,
            amount: oppAmount,
            status: 'OPEN',
            source: lead.source,
          },
        });
        createdOpportunityId = opp.id;

        // Record stage history
        await tx.opportunityStageHistory.create({
          data: {
            opportunityId: opp.id,
            toStageId: stageId,
            changedBy: lead.ownerId,
          },
        });

        // Save products if productIds provided, or copy from Lead's interested products
        const finalProductIds =
          dto.productIds && Array.isArray(dto.productIds) && dto.productIds.length > 0
            ? dto.productIds
            : (await tx.leadProduct.findMany({ where: { leadId } })).map((lp) => lp.productId);

        if (finalProductIds.length > 0) {
          for (const pid of finalProductIds) {
            const prod = await tx.product.findFirst({ where: { id: BigInt(pid), bizId } });
            if (prod) {
              const uPrice = Number(prod.unitPrice);
              await tx.opportunityProduct.create({
                data: {
                  opportunityId: opp.id,
                  productId: prod.id,
                  quantity: 1,
                  unitPrice: uPrice,
                  totalPrice: uPrice,
                },
              });
            }
          }
        }

        // Publish Event
        await publishOutboxEvent(tx, bizId, 'OPPORTUNITY_CREATED', 'OPPORTUNITY', opp.id, {
          id: opp.id.toString(),
          name: opp.name,
          amount: opp.amount,
          owner_id: opp.ownerId?.toString(),
          stage_id: stageId.toString(),
        });
      }

      // 4. Update Lead to CONVERTED
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: 'CONVERTED',
          companyId,
          contactId,
          convertedOpportunityId: createdOpportunityId,
          convertedAt: new Date(),
        },
      });

      // Publish Outbox Event for status CONVERTED
      await publishOutboxEvent(tx, bizId, 'STATUS_CHANGED', 'LEAD', leadId, {
        id: leadId.toString(),
        status: 'CONVERTED',
        owner_id: lead.ownerId?.toString(),
      });

      return {
        success: true,
        leadId: leadId.toString(),
        companyId: companyId?.toString() || null,
        contactId: contactId?.toString() || null,
        opportunityId: createdOpportunityId?.toString() || null,
      };
    });
  }
}
