import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Roles
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: { name: 'Administrator', code: 'ADMIN', description: 'Full system control' },
  });

  const salesRole = await prisma.role.upsert({
    where: { code: 'SALES' },
    update: {},
    create: { name: 'Sales Executive', code: 'SALES', description: 'Handles leads, deals, tasks' },
  });

  const managerRole = await prisma.role.upsert({
    where: { code: 'MANAGER' },
    update: {},
    create: { name: 'Sales Manager', code: 'MANAGER', description: 'Oversees pipeline and automation' },
  });

  // 2. Users (Password: password123)
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      phone: '0901000001',
      userRoles: { create: { roleId: adminRole.id } },
    },
  });

  const sales1User = await prisma.user.upsert({
    where: { email: 'sales1@example.com' },
    update: {},
    create: {
      email: 'sales1@example.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Nguyen',
      phone: '0901000002',
      userRoles: { create: { roleId: salesRole.id } },
    },
  });

  const sales2User = await prisma.user.upsert({
    where: { email: 'sales2@example.com' },
    update: {},
    create: {
      email: 'sales2@example.com',
      passwordHash,
      firstName: 'Tran',
      lastName: 'Bao',
      phone: '0901000003',
      userRoles: { create: { roleId: salesRole.id } },
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      passwordHash,
      firstName: 'David',
      lastName: 'Pham',
      phone: '0901000004',
      userRoles: { create: { roleId: managerRole.id } },
    },
  });

  // 3. Pipeline & Stages
  let pipeline = await prisma.pipeline.findFirst({ where: { isDefault: true } });
  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        name: 'Sales Pipeline',
        isDefault: true,
        isActive: true,
        stages: {
          create: [
            { name: 'New', code: 'NEW', orderNo: 1, probability: 10.0 },
            { name: 'Qualified', code: 'QUALIFIED', orderNo: 2, probability: 25.0 },
            { name: 'Demo', code: 'DEMO', orderNo: 3, probability: 40.0 },
            { name: 'Proposal', code: 'PROPOSAL', orderNo: 4, probability: 60.0 },
            { name: 'Negotiation', code: 'NEGOTIATION', orderNo: 5, probability: 80.0 },
            { name: 'Won', code: 'WON', orderNo: 6, probability: 100.0, isWon: true },
            { name: 'Lost', code: 'LOST', orderNo: 7, probability: 0.0, isLost: true },
          ],
        },
      },
    });
  }

  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { orderNo: 'asc' },
  });

  const newStage = stages.find((s) => s.code === 'NEW') || stages[0];
  const qualifiedStage = stages.find((s) => s.code === 'QUALIFIED') || stages[1];
  const demoStage = stages.find((s) => s.code === 'DEMO') || stages[2];
  const proposalStage = stages.find((s) => s.code === 'PROPOSAL') || stages[3];
  const wonStage = stages.find((s) => s.code === 'WON') || stages[5];

  // 4. Products
  const products = [
    { name: 'CRM Basic', code: 'PROD-CRM-BSC', type: 'PRODUCT', unitPrice: 15000000.0, currency: 'VND' },
    { name: 'CRM Pro', code: 'PROD-CRM-PRO', type: 'PRODUCT', unitPrice: 50000000.0, currency: 'VND' },
    { name: 'HIS Module', code: 'PROD-HIS-MOD', type: 'PRODUCT', unitPrice: 120000000.0, currency: 'VND' },
    { name: 'Implementation Service', code: 'SRV-IMPL', type: 'SERVICE', unitPrice: 10000000.0, currency: 'VND' },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { code: prod.code },
      update: {},
      create: prod,
    });
  }

  // 5. Campaigns
  const campaign = await prisma.campaign.upsert({
    where: { code: 'CAMP-2026-Q3-DIG' },
    update: {},
    create: {
      name: 'Q3 Digital Growth Campaign',
      code: 'CAMP-2026-Q3-DIG',
      type: 'FB_ADS',
      status: 'ACTIVE',
      budget: 50000000.0,
      actualCost: 35000000.0,
      expectedRevenue: 300000000.0,
      ownerId: managerUser.id,
    },
  });

  // 6. Companies & Contacts
  const fptCompany = await prisma.company.create({
    data: {
      name: 'FPT Information System',
      taxCode: '0100109106',
      email: 'contact@fpt.com.vn',
      phone: '02473007300',
      website: 'https://fpt-is.com',
      address: 'Duy Tan, Cau Giay, Hanoi',
      ownerId: sales1User.id,
      status: 'ACTIVE',
      isCustomer: true,
    },
  });

  const vngCompany = await prisma.company.create({
    data: {
      name: 'VNG Corporation',
      taxCode: '0303517001',
      email: 'info@vng.com.vn',
      phone: '02839623888',
      website: 'https://vng.com.vn',
      address: 'Tan Thuan EPZ, Dist 7, HCMC',
      ownerId: sales2User.id,
      status: 'PROSPECT',
      isCustomer: false,
    },
  });

  const minhContact = await prisma.contact.create({
    data: {
      companyId: fptCompany.id,
      firstName: 'Minh',
      lastName: 'Nguyen',
      email: 'minh.nguyen@fpt.com.vn',
      phone: '0912345678',
      position: 'CTO',
      department: 'Technology',
      isPrimary: true,
      ownerId: sales1User.id,
      isCustomer: true,
    },
  });

  const lanContact = await prisma.contact.create({
    data: {
      companyId: vngCompany.id,
      firstName: 'Lan',
      lastName: 'Hoang',
      email: 'lan.hoang@vng.com.vn',
      phone: '0987654321',
      position: 'Procurement Manager',
      department: 'Operations',
      isPrimary: true,
      ownerId: sales2User.id,
    },
  });

  // 7. Customers
  await prisma.customer.create({
    data: {
      customerCode: 'CUST-001',
      entityType: 'COMPANY',
      companyId: fptCompany.id,
      ownerId: sales1User.id,
      status: 'ACTIVE',
      lifetimeValue: 120000000.0,
    },
  });

  // 8. Sample Leads
  const leadsData = [
    { firstName: 'Thanh', lastName: 'Vu', email: 'thanh.vu@gmail.com', phone: '0911111111', companyName: 'Vu Logistics', source: 'WEBSITE', status: 'NEW', rating: 'HOT' },
    { firstName: 'Hoa', lastName: 'Pham', email: 'hoa.pham@tech.io', phone: '0922222222', companyName: 'Pham Tech', source: 'FB_ADS', status: 'CONTACTED', rating: 'WARM' },
    { firstName: 'Kien', lastName: 'Dang', email: 'kien.dang@retail.vn', phone: '0933333333', companyName: 'Dang Retail', source: 'GOOGLE_ADS', status: 'QUALIFIED', rating: 'HOT' },
    { firstName: 'Mai', lastName: 'Le', email: 'mai.le@education.edu.vn', phone: '0944444444', companyName: 'Le Academy', source: 'EVENT', status: 'NEW', rating: 'COLD' },
    { firstName: 'Duc', lastName: 'Bui', email: 'duc.bui@finance.com', phone: '0955555555', companyName: 'Bui Financial', source: 'OUTBOUND', status: 'UNQUALIFIED', rating: 'COLD' },
  ];

  for (const l of leadsData) {
    await prisma.lead.create({
      data: {
        ...l,
        campaignId: campaign.id,
        ownerId: sales1User.id,
      },
    });
  }

  // 9. Sample Opportunities
  const opp1 = await prisma.opportunity.create({
    data: {
      name: 'FPT Hospital CRM Integration',
      companyId: fptCompany.id,
      contactId: minhContact.id,
      ownerId: sales1User.id,
      pipelineId: pipeline.id,
      stageId: wonStage.id,
      amount: 120000000.0,
      probability: 100.0,
      status: 'WON',
      source: 'REFERRAL',
      wonAt: new Date(),
    },
  });

  const opp2 = await prisma.opportunity.create({
    data: {
      name: 'VNG Enterprise CRM Rollout',
      companyId: vngCompany.id,
      contactId: lanContact.id,
      ownerId: sales2User.id,
      pipelineId: pipeline.id,
      stageId: proposalStage.id,
      amount: 50000000.0,
      probability: 60.0,
      status: 'OPEN',
      source: 'FB_ADS',
    },
  });

  const opp3 = await prisma.opportunity.create({
    data: {
      name: 'Dang Retail Sales Automation',
      ownerId: sales1User.id,
      pipelineId: pipeline.id,
      stageId: demoStage.id,
      amount: 25000000.0,
      probability: 40.0,
      status: 'OPEN',
      source: 'GOOGLE_ADS',
    },
  });

  // 10. Sample Tasks & Activities
  await prisma.task.create({
    data: {
      title: 'Contact new lead Thanh Vu',
      description: 'Call to introduce basic CRM packages',
      priority: 'HIGH',
      status: 'TODO',
      assignedTo: sales1User.id,
      dueAt: new Date(Date.now() + 2 * 3600 * 1000), // +2 hours
      relatedType: 'LEAD',
      relatedId: 1,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Prepare Quotation for VNG Enterprise Deal',
      description: 'Generate quotation and send PDF via email',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      assignedTo: sales2User.id,
      dueAt: new Date(Date.now() - 3600 * 1000), // Overdue!
      relatedType: 'OPPORTUNITY',
      relatedId: opp2.id,
    },
  });

  await prisma.activity.create({
    data: {
      type: 'CALL',
      subject: 'Initial Call with Minh Nguyen',
      description: 'Discussed HIS module integration requirements',
      status: 'COMPLETED',
      ownerId: sales1User.id,
      completedAt: new Date(),
      relatedType: 'OPPORTUNITY',
      relatedId: opp1.id,
    },
  });

  // 11. AUTOMATIONS (6 mandatory rules)
  console.log('🤖 Seeding 6 mandatory automation rules...');

  // Rule 1: Lead Created -> Assign Sales & Create Task "Contact new lead" (+2h)
  const auto1 = await prisma.automation.create({
    data: {
      name: 'Auto Assign & Task on New Lead',
      description: 'When a new lead is created, assign sales owner and create immediate follow-up task (+2h)',
      isActive: true,
      triggerType: 'EVENT_BASED',
      priority: 10,
      createdBy: adminUser.id,
      triggers: {
        create: [{ triggerEvent: 'RECORD_CREATED', entityType: 'LEAD' }],
      },
      actions: {
        create: [
          { actionType: 'ASSIGN_OWNER', config: JSON.stringify({ role: 'SALES' }), stepOrder: 1 },
          { actionType: 'CREATE_TASK', config: JSON.stringify({ title: 'Contact new lead', due_in_hours: 2, priority: 'HIGH' }), stepOrder: 2 },
        ],
      },
    },
  });

  // Rule 2: Lead QUALIFIED -> Create Opportunity
  const auto2 = await prisma.automation.create({
    data: {
      name: 'Auto Opportunity on Qualified Lead',
      description: 'Automatically create pipeline opportunity when lead becomes QUALIFIED',
      isActive: true,
      triggerType: 'EVENT_BASED',
      priority: 10,
      createdBy: adminUser.id,
      triggers: {
        create: [{ triggerEvent: 'STATUS_CHANGED', entityType: 'LEAD', config: JSON.stringify({ to_status: 'QUALIFIED' }) }],
      },
      actions: {
        create: [
          { actionType: 'CREATE_OPPORTUNITY', config: JSON.stringify({ amount: 15000000.0 }), stepOrder: 1 },
        ],
      },
    },
  });

  // Rule 3: Opportunity Stage PROPOSAL -> Create Task "Send quotation"
  const auto3 = await prisma.automation.create({
    data: {
      name: 'Auto Task on Proposal Stage',
      description: 'When opportunity reaches PROPOSAL stage, create task to send quotation',
      isActive: true,
      triggerType: 'EVENT_BASED',
      priority: 10,
      createdBy: adminUser.id,
      triggers: {
        create: [{ triggerEvent: 'STAGE_CHANGED', entityType: 'OPPORTUNITY', config: JSON.stringify({ to_stage_code: 'PROPOSAL' }) }],
      },
      actions: {
        create: [
          { actionType: 'CREATE_TASK', config: JSON.stringify({ title: 'Send quotation', due_in_hours: 24, priority: 'HIGH' }), stepOrder: 1 },
        ],
      },
    },
  });

  // Rule 4: Opportunity no activity for 7 days -> Notify owner & create follow-up task
  const auto4 = await prisma.automation.create({
    data: {
      name: 'Stale Opportunity Alert',
      description: 'When opportunity has no activity for 7 days, notify owner and create task',
      isActive: true,
      triggerType: 'TIME_BASED',
      priority: 20,
      createdBy: adminUser.id,
      triggers: {
        create: [{ triggerEvent: 'NO_ACTIVITY_FOR', entityType: 'OPPORTUNITY', config: JSON.stringify({ days: 7 }) }],
      },
      actions: {
        create: [
          { actionType: 'SEND_NOTIFICATION', config: JSON.stringify({ title: 'Stale Opportunity Alert', template: 'Opportunity has had no activity for 7 days!' }), stepOrder: 1 },
          { actionType: 'CREATE_TASK', config: JSON.stringify({ title: 'Re-engage stale deal', due_in_hours: 24, priority: 'URGENT' }), stepOrder: 2 },
        ],
      },
    },
  });

  // Rule 5: Opportunity WON -> Create Customer & Onboarding Task
  const auto5 = await prisma.automation.create({
    data: {
      name: 'Auto Customer & Onboarding on Deal Won',
      description: 'When opportunity is won, promote to Customer and create onboarding task',
      isActive: true,
      triggerType: 'EVENT_BASED',
      priority: 10,
      createdBy: adminUser.id,
      triggers: {
        create: [{ triggerEvent: 'STAGE_CHANGED', entityType: 'OPPORTUNITY', config: JSON.stringify({ to_stage_code: 'WON' }) }],
      },
      actions: {
        create: [
          { actionType: 'CREATE_CUSTOMER', config: JSON.stringify({ status: 'ACTIVE' }), stepOrder: 1 },
          { actionType: 'CREATE_TASK', config: JSON.stringify({ title: 'Kick-off customer onboarding', due_in_hours: 48, priority: 'HIGH' }), stepOrder: 2 },
        ],
      },
    },
  });

  // Rule 6: Task Overdue -> Notify assigned user
  const auto6 = await prisma.automation.create({
    data: {
      name: 'Overdue Task Alert',
      description: 'Send notification when task becomes overdue',
      isActive: true,
      triggerType: 'TIME_BASED',
      priority: 5,
      createdBy: adminUser.id,
      triggers: {
        create: [{ triggerEvent: 'TASK_OVERDUE', entityType: 'TASK' }],
      },
      actions: {
        create: [
          { actionType: 'SEND_NOTIFICATION', config: JSON.stringify({ title: 'Task Overdue Notice', template: 'Task is overdue!' }), stepOrder: 1 },
        ],
      },
    },
  });

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
