import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function runSeedEngine(industryKey: string = 'xedien') {
  console.log(`🌱 [SeedEngine] Starting database seed for industry: "${industryKey}"...`);

  // 1. Resolve dataset file path
  let datasetPath = path.join(process.cwd(), 'prisma', 'datasets', `${industryKey}.json`);
  if (!fs.existsSync(datasetPath)) {
    console.warn(`⚠️ Dataset file for "${industryKey}" not found at ${datasetPath}. Falling back to "xedien.json".`);
    datasetPath = path.join(process.cwd(), 'prisma', 'datasets', 'xedien.json');
  }

  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  const dataset = JSON.parse(rawData);

  console.log(`📦 Loaded Dataset: ${dataset.industryName} (${dataset.industryCode})`);

  // 2. Clean old operational sample data
  console.log('🧹 Clearing old sample data...');
  await prisma.activity.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.quoteItem.deleteMany({});
  await prisma.quote.deleteMany({});
  await prisma.opportunityProduct.deleteMany({});
  await prisma.opportunityStageHistory.deleteMany({});
  await prisma.opportunity.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.automationExecutionLog.deleteMany({});
  await prisma.automationAction.deleteMany({});
  await prisma.automationTrigger.deleteMany({});
  await prisma.automation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // 3. System Roles
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: { name: 'Administrator', code: 'ADMIN', description: 'Quản trị viên hệ thống CRM' },
  });

  const salesRole = await prisma.role.upsert({
    where: { code: 'SALES' },
    update: {},
    create: { name: 'Sales Executive', code: 'SALES', description: 'Chuyên viên tư vấn & bán hàng' },
  });

  const managerRole = await prisma.role.upsert({
    where: { code: 'MANAGER' },
    update: {},
    create: { name: 'Sales Manager', code: 'MANAGER', description: 'Quản lý đội ngũ Sales' },
  });

  // 4. System Users (Default password: password123)
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'Quản trị',
      lastName: 'Hệ Thống',
      phone: '0901000001',
      userRoles: { create: { roleId: adminRole.id } },
    },
  });

  const sales1User = await prisma.user.upsert({
    where: { email: 'sales1@example.com' },
    update: { firstName: 'Sale', lastName: 'Minh' },
    create: {
      email: 'sales1@example.com',
      passwordHash,
      firstName: 'Sale',
      lastName: 'Minh',
      phone: '0901000002',
      userRoles: { create: { roleId: salesRole.id } },
    },
  });

  const sales2User = await prisma.user.upsert({
    where: { email: 'sales2@example.com' },
    update: { firstName: 'Sale', lastName: 'Lan' },
    create: {
      email: 'sales2@example.com',
      passwordHash,
      firstName: 'Sale',
      lastName: 'Lan',
      phone: '0901000003',
      userRoles: { create: { roleId: salesRole.id } },
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: { firstName: 'Sale', lastName: 'Nam' },
    create: {
      email: 'manager@example.com',
      passwordHash,
      firstName: 'Sale',
      lastName: 'Nam',
      phone: '0901000004',
      userRoles: { create: { roleId: managerRole.id } },
    },
  });

  const userMap: Record<string, any> = {
    'admin@example.com': adminUser,
    'sales1@example.com': sales1User,
    'sales2@example.com': sales2User,
    'manager@example.com': managerUser,
  };

  // 5. Pipeline & Stages
  let pipeline = await prisma.pipeline.findFirst({ where: { isDefault: true } });
  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
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
    const created = await prisma.product.create({ data: prodData });
    productMapByCode[prodData.code] = created;
  }

  // 7. Campaigns
  console.log(`📢 Seeding ${dataset.campaigns.length} Campaigns...`);
  const campaignMapByCode: Record<string, any> = {};
  for (const campData of dataset.campaigns) {
    const created = await prisma.campaign.create({
      data: {
        ...campData,
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
          ownerId: sales1User.id,
        },
      });

      let contactRecord = null;
      if (contact) {
        contactRecord = await prisma.contact.create({
          data: {
            ...contact,
            companyId: company.id,
            ownerId: sales1User.id,
            isCustomer: true,
          },
        });
      }

      if (customer) {
        const custRecord = await prisma.customer.create({
          data: {
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
        campaignId: campaign ? campaign.id : null,
        ownerId: assignedUser.id,
      },
    });
    if (key) {
      leadMapByKey[key] = lead;
    }
  }

  // Ensure Lead Mới = 32 (28 có activity/xử lý, 4 chưa xử lý)
  // Create 4 unprocessed leads (status = NEW, 0 activities)
  const salesUsersList = [sales1User, sales2User, managerUser];
  for (let i = 1; i <= 4; i++) {
    await prisma.lead.create({
      data: {
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
        firstName: `Khách tiềm năng mới`,
        lastName: `Đã xử lý #${i}`,
        phone: `09082220${i < 10 ? '0' + i : i}`,
        email: `lead.processed.${i}@example.com`,
        status: 'NEW',
        source: i % 2 === 0 ? 'WEBSITE' : 'HOTLINE',
        ownerId: salesUsersList[i % 3].id,
      },
    });
    // Add an activity for this processed lead
    await prisma.activity.create({
      data: {
        type: 'CALL',
        subject: `Cuộc gọi tiếp cận đầu tiên #${i}`,
        status: 'COMPLETED',
        ownerId: salesUsersList[i % 3].id,
        relatedType: 'LEAD',
        relatedId: processedLead.id,
      },
    });
  }

  // Ensure 13 Inactive Leads > 7 days (status != CONVERTED/LOST, updated 10 days ago)
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000);
  for (let i = 1; i <= 13; i++) {
    const owner = i <= 3 ? sales1User : i <= 6 ? sales2User : managerUser; // 3 for Minh, 3 for Lan, 7 for Nam
    await prisma.lead.create({
      data: {
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
        leadId: lead ? lead.id : null,
        ownerId: assignedUser.id,
        pipelineId: pipeline.id,
        stageId: stage.id,
      },
    });
    if (key) {
      oppMapByKey[key] = opp;
    }

    // Attach products
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

    // Attach quote
    if (quote) {
      const createdQuote = await prisma.quote.create({
        data: {
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
          ownerId: assignedUser.id,
          completedAt: new Date(),
          relatedType: relatedLead ? 'LEAD' : relatedOpp ? 'OPPORTUNITY' : 'GENERAL',
          relatedId: relatedLead ? relatedLead.id : relatedOpp ? relatedOpp.id : null,
        },
      });
    }
  }

  // 12. Tasks & Follow-ups Seeding for Leader Review
  console.log(`📌 Seeding Tasks & Leader Dashboard Demo Data...`);
  const now = Date.now();
  const oneDay = 24 * 3600 * 1000;

  // Sale Minh: 0 overdue, 15 follow-ups today (10 completed, 5 remaining)
  for (let i = 1; i <= 15; i++) {
    await prisma.task.create({
      data: {
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

  // Sale Lan: 2 overdue tasks, 20 follow-ups today (12 completed, 8 remaining)
  for (let i = 1; i <= 2; i++) {
    await prisma.task.create({
      data: {
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

  // Sale Nam: 7 overdue tasks (🔴 CRITICAL), 32 follow-ups today (19 completed, 13 remaining)
  for (let i = 1; i <= 7; i++) {
    await prisma.task.create({
      data: {
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

  console.log(`✅ [SeedEngine] Successfully loaded dataset: "${dataset.industryName}"!`);
  return {
    success: true,
    industryName: dataset.industryName,
    industryCode: dataset.industryCode,
  };
}
