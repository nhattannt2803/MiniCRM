import prisma from '../../config/database';

export interface ActionConfig {
  type: string;
  config: Record<string, any>;
  stepOrder?: number;
}

export class ActionExecutor {
  public static async executeAction(
    action: ActionConfig,
    entityType: string,
    entityId: number | bigint,
    eventPayload: Record<string, any>
  ): Promise<any> {
    const rawConfig = typeof action.config === 'string' ? JSON.parse(action.config) : action.config || {};
    const type = action.type || rawConfig.type;

    // Extract bizId from event payload
    let bizId: bigint | null = eventPayload.bizId ? BigInt(eventPayload.bizId) : null;

    // Fallback: If no bizId in payload, query entity for bizId
    if (!bizId) {
      const eId = BigInt(entityId);
      if (entityType === 'LEAD') {
        const item = await prisma.lead.findUnique({ where: { id: eId }, select: { bizId: true } });
        if (item) bizId = item.bizId;
      } else if (entityType === 'OPPORTUNITY') {
        const item = await prisma.opportunity.findUnique({ where: { id: eId }, select: { bizId: true } });
        if (item) bizId = item.bizId;
      } else if (entityType === 'COMPANY') {
        const item = await prisma.company.findUnique({ where: { id: eId }, select: { bizId: true } });
        if (item) bizId = item.bizId;
      } else if (entityType === 'CONTACT') {
        const item = await prisma.contact.findUnique({ where: { id: eId }, select: { bizId: true } });
        if (item) bizId = item.bizId;
      } else if (entityType === 'CUSTOMER') {
        const item = await prisma.customer.findUnique({ where: { id: eId }, select: { bizId: true } });
        if (item) bizId = item.bizId;
      }
    }

    if (!bizId) {
      console.error(`[ActionExecutor] Cannot execute action: bizId not found for ${entityType} #${entityId}`);
      return { skipped: true, reason: 'bizId not found' };
    }

    switch (type) {
      case 'CREATE_TASK':
        return this.handleCreateTask(bizId, rawConfig, entityType, entityId, eventPayload);
      case 'CREATE_ACTIVITY':
        return this.handleCreateActivity(bizId, rawConfig, entityType, entityId, eventPayload);
      case 'ASSIGN_OWNER':
        return this.handleAssignOwner(bizId, rawConfig, entityType, entityId);
      case 'CHANGE_STATUS':
        return this.handleChangeStatus(bizId, rawConfig, entityType, entityId);
      case 'CHANGE_STAGE':
        return this.handleChangeStage(bizId, rawConfig, entityType, entityId);
      case 'SEND_NOTIFICATION':
        return this.handleSendNotification(bizId, rawConfig, entityType, entityId, eventPayload);
      case 'CREATE_OPPORTUNITY':
        return this.handleCreateOpportunity(bizId, rawConfig, entityType, entityId, eventPayload);
      case 'CREATE_CUSTOMER':
        return this.handleCreateCustomer(bizId, rawConfig, entityType, entityId, eventPayload);
      case 'CALL_WEBHOOK':
        return this.handleCallWebhook(rawConfig, eventPayload);
      default:
        console.log(`[ActionExecutor] Unhandled action type: ${type}`);
        return { skipped: true, reason: `Unknown action type ${type}` };
    }
  }

  private static async handleCreateTask(
    bizId: bigint,
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint,
    eventPayload: Record<string, any>
  ) {
    const title = config.title || (entityType === 'LEAD' ? 'Tư vấn Lead mới' : `Follow up on ${entityType} #${entityId}`);
    const dueHours = config.due_in_hours ? Number(config.due_in_hours) : (entityType === 'LEAD' ? 2 : 24);
    const dueAt = new Date(Date.now() + dueHours * 60 * 60 * 1000);
    const priority = config.priority || (entityType === 'LEAD' ? 'HIGH' : 'MEDIUM');
    const description = config.description || `Tự động tạo nhiệm vụ chăm sóc trong ${dueHours} giờ cho ${entityType} #${entityId}`;

    // Find owner if assigned to owner
    let assignedTo: bigint | null = null;
    if (eventPayload && eventPayload.owner_id) {
      assignedTo = BigInt(eventPayload.owner_id);
    } else {
      const salesMember = await prisma.businessMember.findFirst({
        where: { businessId: bizId, isActive: true },
      });
      if (salesMember) assignedTo = salesMember.userId;
    }

    const task = await prisma.task.create({
      data: {
        bizId,
        title,
        description,
        priority,
        status: 'TODO',
        assignedTo,
        dueAt,
        relatedType: entityType,
        relatedId: BigInt(entityId),
      },
    });

    return {
      ...task,
      id: task.id.toString(),
      assignedTo: task.assignedTo?.toString() || null,
      relatedId: task.relatedId.toString(),
    };
  }

  private static async handleCreateActivity(
    bizId: bigint,
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint,
    eventPayload: Record<string, any>
  ) {
    const activity = await prisma.activity.create({
      data: {
        bizId,
        type: config.activity_type || 'NOTE',
        subject: config.subject || 'Automated Activity',
        description: config.description || 'Activity created by Automation Rule',
        status: 'COMPLETED',
        completedAt: new Date(),
        relatedType: entityType,
        relatedId: BigInt(entityId),
      },
    });
    return activity;
  }

  private static async handleAssignOwner(
    bizId: bigint,
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint
  ) {
    let newOwnerId: bigint | null = null;
    if (config.owner_id) {
      newOwnerId = BigInt(config.owner_id);
    } else {
      const salesMember = await prisma.businessMember.findFirst({
        where: {
          businessId: bizId,
          isActive: true,
          role: { code: { in: ['SALES', 'SALES_REP', 'SALES_MANAGER'] } },
        },
      });
      if (salesMember) newOwnerId = salesMember.userId;
    }

    if (!newOwnerId) return { updated: false, reason: 'No owner found to assign' };

    if (entityType === 'LEAD') {
      await prisma.lead.update({ where: { id: BigInt(entityId) }, data: { ownerId: newOwnerId } });
    } else if (entityType === 'OPPORTUNITY') {
      await prisma.opportunity.update({ where: { id: BigInt(entityId) }, data: { ownerId: newOwnerId } });
    } else if (entityType === 'COMPANY') {
      await prisma.company.update({ where: { id: BigInt(entityId) }, data: { ownerId: newOwnerId } });
    }

    return { updated: true, ownerId: newOwnerId.toString() };
  }

  private static async handleChangeStatus(
    bizId: bigint,
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint
  ) {
    const newStatus = config.new_status || config.to_status;
    if (!newStatus) return { updated: false };

    if (entityType === 'LEAD') {
      await prisma.lead.update({ where: { id: BigInt(entityId) }, data: { status: newStatus } });
    } else if (entityType === 'OPPORTUNITY') {
      await prisma.opportunity.update({ where: { id: BigInt(entityId) }, data: { status: newStatus } });
    }

    return { updated: true, newStatus };
  }

  private static async handleChangeStage(
    bizId: bigint,
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint
  ) {
    if (entityType !== 'OPPORTUNITY') return { updated: false };

    const targetStageCode = config.stage_code || config.to_stage_code;
    const stage = await prisma.pipelineStage.findFirst({
      where: { code: targetStageCode, pipeline: { bizId } },
    });
    if (!stage) return { updated: false, reason: 'Stage code not found' };

    await prisma.opportunity.update({
      where: { id: BigInt(entityId) },
      data: { stageId: stage.id },
    });

    return { updated: true, stageId: stage.id.toString(), stageCode: targetStageCode };
  }

  private static async handleSendNotification(
    bizId: bigint,
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint,
    eventPayload: Record<string, any>
  ) {
    let targetUserId: bigint | null = null;
    if (eventPayload && eventPayload.owner_id) {
      targetUserId = BigInt(eventPayload.owner_id);
    } else if (eventPayload && eventPayload.assigned_to) {
      targetUserId = BigInt(eventPayload.assigned_to);
    } else {
      const adminMember = await prisma.businessMember.findFirst({
        where: { businessId: bizId, isActive: true },
      });
      if (adminMember) targetUserId = adminMember.userId;
    }

    if (!targetUserId) return { created: false };

    const notification = await prisma.notification.create({
      data: {
        bizId,
        userId: targetUserId,
        type: 'AUTOMATION_ALERT',
        title: config.title || 'Automation Notification',
        message: config.template || config.message || `Automated alert for ${entityType} #${entityId}`,
        entityType,
        entityId: BigInt(entityId),
      },
    });

    return notification;
  }

  private static async handleCreateOpportunity(
    bizId: bigint,
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint,
    eventPayload: Record<string, any>
  ) {
    if (entityType === 'LEAD') {
      const lead = await prisma.lead.findUnique({ where: { id: BigInt(entityId) } });
      if (!lead) return { created: false };

      // Prevent duplicate opportunity creation
      const existingOpp = await prisma.opportunity.findFirst({
        where: {
          bizId,
          leadId: lead.id,
          status: 'OPEN',
          deletedAt: null,
        },
      });
      if (existingOpp) {
        console.log(`[ActionExecutor] Skip creating duplicate opportunity: Lead #${lead.id} already has an OPEN opportunity #${existingOpp.id}`);
        return { created: false, reason: 'OPEN opportunity already exists for this Lead', opportunityId: existingOpp.id.toString() };
      }

      // Resolve pipeline
      let pipeline;
      if (config.pipeline_id) {
        pipeline = await prisma.pipeline.findFirst({
          where: { id: BigInt(config.pipeline_id), bizId },
          include: { stages: { orderBy: { orderNo: 'asc' } } },
        });
      }
      if (!pipeline) {
        pipeline = await prisma.pipeline.findFirst({
          where: { bizId, isDefault: true },
          include: { stages: { orderBy: { orderNo: 'asc' } } },
        });
      }
      if (!pipeline || pipeline.stages.length === 0) return { created: false, reason: 'No pipeline or stages found' };

      // Resolve stage
      let targetStage;
      if (config.stage_id) {
        targetStage = pipeline.stages.find((s: any) => s.id.toString() === config.stage_id.toString());
      }
      if (!targetStage) {
        targetStage = pipeline.stages[0];
      }

      const leadProducts = await prisma.leadProduct.findMany({
        where: { leadId: lead.id },
        include: { product: true },
      });

      let amount = config.amount ? Number(config.amount) : 0;
      if (!amount || amount === 0) {
        if (leadProducts.length > 0) {
          amount = leadProducts.reduce((sum, lp) => sum + (lp.product ? Number(lp.product.unitPrice) : 0), 0);
        }
      }

      const oppName = `Deal from ${lead.firstName} ${lead.lastName} (${lead.companyName || 'Individual'})`;

      const opp = await prisma.opportunity.create({
        data: {
          bizId,
          name: oppName,
          leadId: lead.id,
          companyId: lead.companyId,
          contactId: lead.contactId,
          customerId: lead.customerId,
          ownerId: lead.ownerId,
          pipelineId: pipeline.id,
          stageId: targetStage.id,
          amount: amount,
          probability: targetStage.probability,
          status: 'OPEN',
          source: lead.source,
        },
      });

      if (leadProducts.length > 0) {
        for (const lp of leadProducts) {
          if (lp.product) {
            const uPrice = Number(lp.product.unitPrice);
            await prisma.opportunityProduct.create({
              data: {
                opportunityId: opp.id,
                productId: lp.productId,
                quantity: 1,
                unitPrice: uPrice,
                totalPrice: uPrice,
              },
            });
          }
        }
      }

      return opp;
    }
    return { created: false };
  }

  private static async handleCreateCustomer(
    bizId: bigint,
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint,
    eventPayload: Record<string, any>
  ) {
    let companyId: bigint | null = null;
    let contactId: bigint | null = null;
    let ownerId: bigint | null = null;

    if (entityType === 'OPPORTUNITY') {
      const opp = await prisma.opportunity.findUnique({ where: { id: BigInt(entityId) } });
      if (opp) {
        companyId = opp.companyId;
        contactId = opp.contactId;
        ownerId = opp.ownerId;
      }
    } else if (entityType === 'COMPANY') {
      companyId = BigInt(entityId);
    } else if (entityType === 'CONTACT') {
      contactId = BigInt(entityId);
    }

    if (!companyId && !contactId) return { created: false, reason: 'No Company or Contact linked' };

    const existing = await prisma.customer.findFirst({
      where: {
        bizId,
        OR: [
          companyId ? { companyId } : {},
          contactId ? { contactId } : {},
        ],
      },
    });

    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });
      return { updated: true, customerId: existing.id.toString() };
    }

    const customerCode = `CUST-${Date.now()}`;
    const eType = companyId ? 'COMPANY' : 'CONTACT';

    const customer = await prisma.customer.create({
      data: {
        bizId,
        customerCode,
        entityType: eType,
        companyId,
        contactId,
        ownerId,
        status: 'ACTIVE',
      },
    });

    if (companyId) {
      await prisma.company.update({ where: { id: companyId }, data: { isCustomer: true } });
    }
    if (contactId) {
      await prisma.contact.update({ where: { id: contactId }, data: { isCustomer: true } });
    }

    return customer;
  }

  private static async handleCallWebhook(config: Record<string, any>, payload: Record<string, any>) {
    console.log(`[ActionExecutor] Calling Webhook to ${config.url}`, payload);
    return { status: 200, message: 'Webhook triggered' };
  }
}
