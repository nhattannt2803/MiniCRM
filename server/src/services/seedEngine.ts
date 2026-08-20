import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function runSeedEngine(bizIdInput?: bigint | string, industryKeyParam: string = 'xedien') {
  let bizId: bigint | null = null;
  let industryKey = industryKeyParam;

  if (typeof bizIdInput === 'string' && isNaN(Number(bizIdInput))) {
    // bizIdInput is actually industryKey!
    industryKey = bizIdInput;
  } else if (bizIdInput) {
    bizId = BigInt(bizIdInput);
  }

  console.log(`🌱 [SeedEngine] Starting database seed for industry: "${industryKey}"...`);

  // Resolve Business
  if (!bizId) {
    // Find or create default Business
    let defaultBiz = await prisma.business.findFirst({ where: { slug: 'default-biz' } });
    if (!defaultBiz) {
      defaultBiz = await prisma.business.create({
        data: {
          name: 'Doanh Nghiệp Mặc Định',
          slug: 'default-biz',
          status: 'ACTIVE',
          plan: 'ENTERPRISE',
        },
      });
    }
    bizId = defaultBiz.id;
  }

  // 1. Resolve dataset file path
  let datasetPath = path.join(process.cwd(), 'prisma', 'datasets', `${industryKey}.json`);
  if (!fs.existsSync(datasetPath)) {
    console.warn(`⚠️ Dataset file for "${industryKey}" not found at ${datasetPath}. Falling back to "xedien.json".`);
    datasetPath = path.join(process.cwd(), 'prisma', 'datasets', 'xedien.json');
  }

  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  const dataset = JSON.parse(rawData);

  console.log(`📦 Loaded Dataset: ${dataset.industryName} (${dataset.industryCode})`);

  // 2. Clean old operational sample data for this Biz
  console.log(`🧹 Clearing old sample data for Business #${bizId}...`);
  await prisma.activity.deleteMany({ where: { bizId } });
  await prisma.task.deleteMany({ where: { bizId } });
  await prisma.quoteItem.deleteMany({ where: { quote: { bizId } } });
  await prisma.quote.deleteMany({ where: { bizId } });
  await prisma.opportunityProduct.deleteMany({ where: { opportunity: { bizId } } });
  await prisma.opportunityStageHistory.deleteMany({ where: { opportunity: { bizId } } });
  await prisma.opportunity.deleteMany({ where: { bizId } });
  await prisma.leadProduct.deleteMany({ where: { lead: { bizId } } });
  await prisma.lead.deleteMany({ where: { bizId } });
  await prisma.customerIdentity.deleteMany({ where: { customer: { bizId } } });
  await prisma.customer.deleteMany({ where: { bizId } });
  await prisma.contact.deleteMany({ where: { bizId } });
  await prisma.company.deleteMany({ where: { bizId } });
  await prisma.campaign.deleteMany({ where: { bizId } });
  await prisma.productMapping.deleteMany({ where: { bizId } });
  await prisma.product.deleteMany({ where: { bizId } });
  await prisma.automationExecutionLog.deleteMany({ where: { execution: { automation: { bizId } } } });
  await prisma.automationExecution.deleteMany({ where: { automation: { bizId } } });
  await prisma.automationAction.deleteMany({ where: { automation: { bizId } } });
  await prisma.automationCondition.deleteMany({ where: { automation: { bizId } } });
  await prisma.automationTrigger.deleteMany({ where: { automation: { bizId } } });
  await prisma.automation.deleteMany({ where: { bizId } });
  await prisma.notification.deleteMany({ where: { bizId } });
  await prisma.auditLog.deleteMany({ where: { bizId } });

  // 3. System Roles for this Biz
  const adminRole = await prisma.role.upsert({
    where: { bizId_code: { bizId, code: 'ADMIN' } },
    update: {},
    create: { bizId, name: 'Administrator', code: 'ADMIN', description: 'Quản trị viên hệ thống CRM' },
  });

  const salesRole = await prisma.role.upsert({
    where: { bizId_code: { bizId, code: 'SALES' } },
    update: {},
    create: { bizId, name: 'Sales Executive', code: 'SALES', description: 'Chuyên viên tư vấn & bán hàng' },
  });

  const managerRole = await prisma.role.upsert({
    where: { bizId_code: { bizId, code: 'MANAGER' } },
    update: {},
    create: { bizId, name: 'Sales Manager', code: 'MANAGER', description: 'Quản lý đội ngũ Sales' },
  });

  // 4. System Users & Business Memberships
  const defaultPasswordHash = await bcrypt.hash('pass123', 10);
  const nhattanPasswordHash = await bcrypt.hash('Tan@123!', 10);

  const upsertUserWithMember = async (
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
    roleId: bigint,
    isSuperAdmin: boolean = false,
    customPasswordHash?: string
  ) => {
    const pwdHash = customPasswordHash || defaultPasswordHash;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: pwdHash,
          firstName,
          lastName,
          phone,
          isSuperAdmin,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: pwdHash,
          ...(isSuperAdmin ? { isSuperAdmin: true } : {}),
        },
      });
    }
    // Ensure membership in this biz
    await prisma.businessMember.upsert({
      where: { businessId_userId: { businessId: bizId, userId: user.id } },
      update: { roleId, isActive: true },
      create: {
        businessId: bizId,
        userId: user.id,
        roleId,
        isDefault: true,
        isActive: true,
      },
    });
    return user;
  };

  const nhattanUser = await upsertUserWithMember(
    'nhattannt2803@gmail.com',
    'Nhật Tấn',
    'Nguyễn',
    '0987654321',
    adminRole.id,
    true,
    nhattanPasswordHash
  );
  const adminUser = await upsertUserWithMember('admin@example.com', 'Quản trị', 'Hệ Thống', '0901000001', adminRole.id, true);
  const sales1User = await upsertUserWithMember('sales1@example.com', 'Sale', 'Minh', '0901000002', salesRole.id);
  const sales2User = await upsertUserWithMember('sales2@example.com', 'Sale', 'Lan', '0901000003', salesRole.id);
  const managerUser = await upsertUserWithMember('manager@example.com', 'Sale', 'Nam', '0901000004', managerRole.id);

  const userMap: Record<string, any> = {
    'nhattannt2803@gmail.com': nhattanUser,
    'admin@example.com': adminUser,
    'sales1@example.com': sales1User,
    'sales2@example.com': sales2User,
    'manager@example.com': managerUser,
  };

  // 5. Pipeline & Stages
  let pipeline = await prisma.pipeline.findFirst({ where: { bizId, isDefault: true } });
  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        bizId,
        name: dataset.pipelineName || 'Quy trình Bán Hàng',
        isDefault: true,
        isActive: true,
        stages: {
          create: dataset.pipelineStages || [
            { name: 'Khách mới (New)', code: 'NEW', orderNo: 1, probability: 10.0 },
            { name: 'Đã tư vấn (Qualified)', code: 'QUALIFIED', orderNo: 2, probability: 25.0 },
            { name: 'Lái thử / Trải nghiệm (Demo)', code: 'DEMO', orderNo: 3, probability: 45.0 },
            { name: 'Báo giá & Trả góp (Proposal)', code: 'PROPOSAL', orderNo: 4, probability: 65.0 },
            { name: 'Thương lượng (Negotiation)', code: 'NEGOTIATION', orderNo: 5, probability: 85.0 },
            { name: 'Chốt đơn thành công (Won)', code: 'WON', orderNo: 6, probability: 100.0, isWon: true },
            { name: 'Khách hủy / Thất bại (Lost)', code: 'LOST', orderNo: 7, probability: 0.0, isLost: true },
          ],
        },
      },
    });
  } else if (dataset.pipelineName) {
    await prisma.pipeline.update({
      where: { id: pipeline.id },
      data: { name: dataset.pipelineName },
    });
  }

  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { orderNo: 'asc' },
  });

  const stageMapByCode: Record<string, any> = {};
  for (const st of stages) {
    stageMapByCode[st.code] = st;
  }

  // 6. Products
  console.log(`🛍️ Seeding ${dataset.products.length} Products...`);
  const productMapByCode: Record<string, any> = {};
  for (const prodData of dataset.products) {
    const created = await prisma.product.create({ data: { ...prodData, bizId } });
    productMapByCode[prodData.code] = created;
  }

  // 7. Campaigns
  console.log(`📢 Seeding ${dataset.campaigns.length} Campaigns...`);
  const campaignMapByCode: Record<string, any> = {};
  for (const campData of dataset.campaigns) {
    const created = await prisma.campaign.create({
      data: {
        ...campData,
        bizId,
        ownerId: managerUser.id,
      },
    });
    campaignMapByCode[campData.code] = created;
  }

  // 8. Companies, Contacts, Customers
  console.log(`🏢 Seeding Companies & Customers...`);
  if (dataset.companies) {
    for (const compData of dataset.companies) {
      const { contact, customer, ...compFields } = compData;
      const company = await prisma.company.create({
        data: {
          ...compFields,
          bizId,
          ownerId: sales1User.id,
        },
      });

      let contactRecord = null;
      if (contact) {
        contactRecord = await prisma.contact.create({
          data: {
            ...contact,
            bizId,
            companyId: company.id,
            ownerId: sales1User.id,
            isCustomer: true,
          },
        });
      }

      if (customer) {
        const custRecord = await prisma.customer.create({
          data: {
            bizId,
            customerCode: customer.customerCode,
            entityType: 'COMPANY',
            companyId: company.id,
            contactId: contactRecord ? contactRecord.id : null,
            ownerId: sales1User.id,
            status: 'ACTIVE',
            lifetimeValue: customer.lifetimeValue || 0.0,
          },
        });

        if (company.phone) {
          await prisma.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: custRecord.id, type: 'PHONE', identityValue: company.phone } },
            update: { status: 'ACTIVE' },
            create: { customerId: custRecord.id, type: 'PHONE', identityValue: company.phone, isVerified: true },
          });
        }
        if (company.email) {
          await prisma.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: custRecord.id, type: 'EMAIL', identityValue: company.email } },
            update: { status: 'ACTIVE' },
            create: { customerId: custRecord.id, type: 'EMAIL', identityValue: company.email, isVerified: true },
          });
        }
        if (contactRecord?.phone && contactRecord.phone !== company.phone) {
          await prisma.customerIdentity.upsert({
            where: { customerId_type_identityValue: { customerId: custRecord.id, type: 'PHONE', identityValue: contactRecord.phone } },
            update: { status: 'ACTIVE' },
            create: { customerId: custRecord.id, type: 'PHONE', identityValue: contactRecord.phone, isVerified: true },
          });
        }
      }
    }
  }

  // 9. Leads
  console.log(`💬 Seeding Leads for Leader Dashboard...`);
  const leadMapByKey: Record<string, any> = {};
  for (const lData of dataset.leads) {
    const { key, campaignCode, salesUserEmail, ...leadFields } = lData;
    const assignedUser = userMap[salesUserEmail] || sales1User;
    const campaign = campaignCode ? campaignMapByCode[campaignCode] : null;

    const lead = await prisma.lead.create({
      data: {
        ...leadFields,
        bizId,
        campaignId: campaign ? campaign.id : null,
        ownerId: assignedUser.id,
      },
    });
    if (key) {
      leadMapByKey[key] = lead;
    }
  }

  // Create 4 unprocessed leads (status = NEW, 0 activities)
  const salesUsersList = [sales1User, sales2User, managerUser];
  for (let i = 1; i <= 4; i++) {
    await prisma.lead.create({
      data: {
        bizId,
        firstName: `Khách mới chưa gọi`,
        lastName: `#${i}`,
        phone: `090811100${i}`,
        email: `lead.unprocessed.${i}@example.com`,
        status: 'NEW',
        source: 'FACEBOOK',
        ownerId: salesUsersList[i % 3].id,
      },
    });
  }

  // Create 28 NEW leads that have activity
  for (let i = 1; i <= 28; i++) {
    const processedLead = await prisma.lead.create({
      data: {
        bizId,
        firstName: `Khách tiềm năng mới`,
        lastName: `Đã xử lý #${i}`,
        phone: `09082220${i < 10 ? '0' + i : i}`,
        email: `lead.processed.${i}@example.com`,
        status: 'NEW',
        source: i % 2 === 0 ? 'WEBSITE' : 'HOTLINE',
        ownerId: salesUsersList[i % 3].id,
      },
    });
    await prisma.activity.create({
      data: {
        bizId,
        type: 'CALL',
        subject: `Cuộc gọi tiếp cận đầu tiên #${i}`,
        status: 'COMPLETED',
        ownerId: salesUsersList[i % 3].id,
        relatedType: 'LEAD',
        relatedId: processedLead.id,
      },
    });
  }

  // Ensure 13 Inactive Leads > 7 days
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000);
  for (let i = 1; i <= 13; i++) {
    const owner = i <= 3 ? sales1User : i <= 6 ? sales2User : managerUser;
    await prisma.lead.create({
      data: {
        bizId,
        firstName: `Khách bỏ quên`,
        lastName: `>7d #${i}`,
        phone: `09093330${i < 10 ? '0' + i : i}`,
        email: `inactive.lead.${i}@example.com`,
        status: 'QUALIFIED',
        source: 'ZALO',
        ownerId: owner.id,
        createdAt: tenDaysAgo,
        updatedAt: tenDaysAgo,
      },
    });
  }

  // 10. Opportunities
  console.log(`💼 Seeding ${dataset.opportunities.length} Opportunities...`);
  const oppMapByKey: Record<string, any> = {};
  for (const oppData of dataset.opportunities) {
    const { key, leadKey, salesUserEmail, stageCode, products, quote, ...oppFields } = oppData;
    const assignedUser = userMap[salesUserEmail] || sales1User;
    const lead = leadKey ? leadMapByKey[leadKey] : null;
    const stage = stageMapByCode[stageCode] || stages[0];

    const opp = await prisma.opportunity.create({
      data: {
        ...oppFields,
        bizId,
        leadId: lead ? lead.id : null,
        ownerId: assignedUser.id,
        pipelineId: pipeline.id,
        stageId: stage.id,
      },
    });
    if (key) {
      oppMapByKey[key] = opp;
    }

    if (products && Array.isArray(products)) {
      for (const pItem of products) {
        const prod = productMapByCode[pItem.productCode];
        if (prod) {
          await prisma.opportunityProduct.create({
            data: {
              opportunityId: opp.id,
              productId: prod.id,
              quantity: pItem.quantity || 1,
              unitPrice: pItem.unitPrice || prod.unitPrice,
              totalPrice: (pItem.quantity || 1) * (pItem.unitPrice || prod.unitPrice),
              notes: pItem.notes || null,
            },
          });
        }
      }
    }

    if (quote) {
      const createdQuote = await prisma.quote.create({
        data: {
          bizId,
          opportunityId: opp.id,
          quoteNumber: quote.quoteNumber,
          version: 1,
          subtotal: quote.subtotal,
          discountAmount: quote.discountAmount || 0,
          taxAmount: 0,
          totalAmount: quote.totalAmount,
          currency: 'VND',
          status: quote.status || 'SENT',
          createdBy: assignedUser.id,
        },
      });

      if (products && Array.isArray(products)) {
        for (const pItem of products) {
          const prod = productMapByCode[pItem.productCode];
          if (prod) {
            await prisma.quoteItem.create({
              data: {
                quoteId: createdQuote.id,
                productId: prod.id,
                itemDescription: `${prod.name} ${pItem.notes ? `(${pItem.notes})` : ''}`,
                quantity: pItem.quantity || 1,
                unitPrice: pItem.unitPrice || prod.unitPrice,
                totalPrice: (pItem.quantity || 1) * (pItem.unitPrice || prod.unitPrice),
              },
            });
          }
        }
      }
    }
  }

  // 11. Activities
  if (dataset.activities) {
    console.log(`📝 Seeding ${dataset.activities.length} Activities...`);
    for (const actData of dataset.activities) {
      const { salesUserEmail, relatedLeadKey, relatedOppKey, ...actFields } = actData;
      const assignedUser = userMap[salesUserEmail] || sales1User;
      const relatedLead = relatedLeadKey ? leadMapByKey[relatedLeadKey] : null;
      const relatedOpp = relatedOppKey ? oppMapByKey[relatedOppKey] : null;

      await prisma.activity.create({
        data: {
          ...actFields,
          bizId,
          ownerId: assignedUser.id,
          completedAt: new Date(),
          relatedType: relatedLead ? 'LEAD' : relatedOpp ? 'OPPORTUNITY' : 'GENERAL',
          relatedId: relatedLead ? relatedLead.id : relatedOpp ? relatedOpp.id : 1n,
        },
      });
    }
  }

  // 12. Tasks
  console.log(`📌 Seeding Tasks & Leader Dashboard Demo Data...`);
  const now = Date.now();
  const oneDay = 24 * 3600 * 1000;

  for (let i = 1; i <= 15; i++) {
    await prisma.task.create({
      data: {
        bizId,
        title: `Gọi điện chăm sóc khách hàng Minh #${i}`,
        priority: i % 2 === 0 ? 'HIGH' : 'MEDIUM',
        status: i <= 10 ? 'COMPLETED' : 'TODO',
        dueAt: new Date(now),
        completedAt: i <= 10 ? new Date(now - 3600 * 1000) : null,
        assignedTo: sales1User.id,
        relatedType: 'LEAD',
        relatedId: 1n,
      },
    });
  }

  for (let i = 1; i <= 2; i++) {
    await prisma.task.create({
      data: {
        bizId,
        title: `[Quá hạn] Báo giá hợp đồng xe đạp điện - Sale Lan #${i}`,
        priority: 'URGENT',
        status: 'TODO',
        dueAt: new Date(now - (i + 1) * oneDay),
        assignedTo: sales2User.id,
        relatedType: 'LEAD',
        relatedId: 2n,
      },
    });
  }
  for (let i = 1; i <= 20; i++) {
    await prisma.task.create({
      data: {
        bizId,
        title: `Tư vấn tính năng & thủ tục trả góp - Sale Lan #${i}`,
        priority: 'MEDIUM',
        status: i <= 12 ? 'COMPLETED' : 'TODO',
        dueAt: new Date(now),
        completedAt: i <= 12 ? new Date(now - 1800 * 1000) : null,
        assignedTo: sales2User.id,
        relatedType: 'LEAD',
        relatedId: 2n,
      },
    });
  }

  for (let i = 1; i <= 7; i++) {
    await prisma.task.create({
      data: {
        bizId,
        title: `🔴 [QUÁ HẠN KHẨN] Đặt lịch lái thử xe & chốt hợp đồng - Sale Nam #${i}`,
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        dueAt: new Date(now - (i + 2) * oneDay),
        assignedTo: managerUser.id,
        relatedType: 'LEAD',
        relatedId: 3n,
      },
    });
  }
  for (let i = 1; i <= 32; i++) {
    await prisma.task.create({
      data: {
        bizId,
        title: `Theo dõi phản hồi đề xuất báo giá - Sale Nam #${i}`,
        priority: 'HIGH',
        status: i <= 19 ? 'COMPLETED' : 'TODO',
        dueAt: new Date(now),
        completedAt: i <= 19 ? new Date(now - 7200 * 1000) : null,
        assignedTo: managerUser.id,
        relatedType: 'LEAD',
        relatedId: 3n,
      },
    });
  }

  // 13. Automations
  if (dataset.automations) {
    console.log(`🤖 Seeding ${dataset.automations.length} Automations...`);
    for (const autoData of dataset.automations) {
      await prisma.automation.create({
        data: {
          bizId,
          name: autoData.name,
          description: autoData.description,
          isActive: true,
          triggerType: 'EVENT_BASED',
          priority: 10,
          createdBy: adminUser.id,
          triggers: {
            create: [
              {
                triggerEvent: autoData.triggerEvent,
                entityType: autoData.entityType,
                config: autoData.toStatus ? JSON.stringify({ to_status: autoData.toStatus }) : undefined,
              },
            ],
          },
          actions: {
            create: [
              autoData.actionRole
                ? { actionType: 'ASSIGN_OWNER', config: JSON.stringify({ role: autoData.actionRole }), stepOrder: 1 }
                : { actionType: 'CREATE_OPPORTUNITY', config: JSON.stringify({ amount: 10000000.0 }), stepOrder: 1 },
              autoData.taskTitle
                ? { actionType: 'CREATE_TASK', config: JSON.stringify({ title: autoData.taskTitle, due_in_hours: 2, priority: 'HIGH' }), stepOrder: 2 }
                : undefined,
            ].filter(Boolean) as any,
          },
        },
      });
    }
  }

  console.log(`✅ [SeedEngine] Successfully loaded dataset: "${dataset.industryName}" for Business #${bizId}!`);
  return {
    success: true,
    industryName: dataset.industryName,
    industryCode: dataset.industryCode,
  };
}