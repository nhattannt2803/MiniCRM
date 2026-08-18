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

    switch (type) {
      case 'CREATE_TASK':
        return this.handleCreateTask(rawConfig, entityType, entityId, eventPayload);
      case 'CREATE_ACTIVITY':
        return this.handleCreateActivity(rawConfig, entityType, entityId, eventPayload);
      case 'ASSIGN_OWNER':
        return this.handleAssignOwner(rawConfig, entityType, entityId);
      case 'CHANGE_STATUS':
        return this.handleChangeStatus(rawConfig, entityType, entityId);
      case 'CHANGE_STAGE':
        return this.handleChangeStage(rawConfig, entityType, entityId);
      case 'SEND_NOTIFICATION':
        return this.handleSendNotification(rawConfig, entityType, entityId, eventPayload);
      case 'CREATE_OPPORTUNITY':
        return this.handleCreateOpportunity(rawConfig, entityType, entityId, eventPayload);
      case 'CREATE_CUSTOMER':
        return this.handleCreateCustomer(rawConfig, entityType, entityId, eventPayload);
      case 'CALL_WEBHOOK':
        return this.handleCallWebhook(rawConfig, eventPayload);
      default:
        console.log(`[ActionExecutor] Unhandled action type: ${type}`);
        return { skipped: true, reason: `Unknown action type ${type}` };
    }
  }

  private static async handleCreateTask(
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
      const salesUser = await prisma.user.findFirst({ where: { isActive: true } });
      if (salesUser) assignedTo = salesUser.id;
    }

    const task = await prisma.task.create({
      data: {
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
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint,
    eventPayload: Record<string, any>
  ) {
    const activity = await prisma.activity.create({
      data: {
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
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint
  ) {
    // Pick sales user or explicit user
    let newOwnerId: bigint | null = null;
    if (config.owner_id) {
      newOwnerId = BigInt(config.owner_id);
    } else {
      // Pick first active sales user
      const salesUser = await prisma.user.findFirst({
        where: {
          isActive: true,
          userRoles: { some: { role: { code: 'SALES' } } },
        },
      });
      if (salesUser) newOwnerId = salesUser.id;
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
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint
  ) {
    if (entityType !== 'OPPORTUNITY') return { updated: false };

    const targetStageCode = config.stage_code || config.to_stage_code;
    const stage = await prisma.pipelineStage.findFirst({ where: { code: targetStageCode } });
    if (!stage) return { updated: false, reason: 'Stage code not found' };

    await prisma.opportunity.update({
      where: { id: BigInt(entityId) },
      data: { stageId: stage.id },
    });

    return { updated: true, stageId: stage.id.toString(), stageCode: targetStageCode };
  }

  private static async handleSendNotification(
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
      const admin = await prisma.user.findFirst();
      if (admin) targetUserId = admin.id;
    }

    if (!targetUserId) return { created: false };

    const notification = await prisma.notification.create({
      data: {
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
    config: Record<string, any>,
    entityType: string,
    entityId: number | bigint,
    eventPayload: Record<string, any>
  ) {
    if (entityType === 'LEAD') {
      const lead = await prisma.lead.findUnique({ where: { id: BigInt(entityId) } });
      if (!lead) return { created: false };

      // Prevent duplicate opportunity creation: Check if an OPEN opportunity already exists for this lead
      const existingOpp = await prisma.opportunity.findFirst({
        where: {
          leadId: lead.id,
          status: 'OPEN',
          deletedAt: null,
        },
      });
      if (existingOpp) {
        console.log(`[ActionExecutor] Skip creating duplicate opportunity: Lead #${lead.id} already has an OPEN opportunity #${existingOpp.id}`);
        return { created: false, reason: 'OPEN opportunity already exists for this Lead', opportunityId: existingOpp.id.toString() };
      }

      // Resolve pipeline: use config.pipeline_id if provided, else fall back to default pipeline
      let pipeline;
      if (config.pipeline_id) {
        pipeline = await prisma.pipeline.findUnique({
          where: { id: BigInt(config.pipeline_id) },
          include: { stages: { orderBy: { orderNo: 'asc' } } },
        });
      }
      if (!pipeline) {
        pipeline = await prisma.pipeline.findFirst({
          where: { isDefault: true },
          include: { stages: { orderBy: { orderNo: 'asc' } } },
        });
      }
      if (!pipeline || pipeline.stages.length === 0) return { created: false, reason: 'No pipeline or stages found' };

      // Resolve stage: use config.stage_id if provided, else use first stage of pipeline
      let targetStage;
      if (config.stage_id) {
        targetStage = pipeline.stages.find((s: any) => s.id.toString() === config.stage_id.toString());
      }
      if (!targetStage) {
        targetStage = pipeline.stages[0];
      }

      // Fetch lead products with product details
      const leadProducts = await prisma.leadProduct.findMany({
        where: { leadId: lead.id },
        include: { product: true },
      });

      // Resolve initial opportunity value:
      // If config.amount is provided and > 0, use config.amount.
      // Otherwise, sum the unit prices of all products associated with this Lead.
      let amount = config.amount ? Number(config.amount) : 0;
      if (!amount || amount === 0) {
        if (leadProducts.length > 0) {
          amount = leadProducts.reduce((sum, lp) => sum + (lp.product ? Number(lp.product.unitPrice) : 0), 0);
        }
      }

      const oppName = `Deal from ${lead.firstName} ${lead.lastName} (${lead.companyName || 'Individual'})`;

      const opp = await prisma.opportunity.create({
        data: {
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

      // Copy lead products to opportunity products
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

    // Check existing customer
    const existing = await prisma.customer.findFirst({
      where: {
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
