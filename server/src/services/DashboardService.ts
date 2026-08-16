import prisma from '../config/database';

export class DashboardService {
  public static async getDashboardStats() {
    const now = new Date();

    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      openOpportunities,
      oppSums,
      wonRevenueSum,
      overdueTasksCount,
      leadsBySource,
      stages,
      oppsByStage,
    ] = await Promise.all([
      prisma.lead.count({ where: { deletedAt: null } }),
      prisma.lead.count({ where: { status: 'NEW', deletedAt: null } }),
      prisma.lead.count({ where: { status: 'QUALIFIED', deletedAt: null } }),
      prisma.opportunity.count({ where: { status: 'OPEN', deletedAt: null } }),
      prisma.opportunity.findMany({
        where: { status: 'OPEN', deletedAt: null },
        select: { amount: true, probability: true },
      }),
      prisma.opportunity.aggregate({
        where: { status: 'WON', deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.task.count({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueAt: { lt: now },
        },
      }),
      prisma.lead.groupBy({
        by: ['source'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      prisma.pipelineStage.findMany({
        where: { isActive: true },
        orderBy: { orderNo: 'asc' },
      }),
      prisma.opportunity.groupBy({
        by: ['stageId'],
        where: { deletedAt: null },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const pipelineValue = oppSums.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const weightedPipeline = oppSums.reduce(
      (acc, curr) => acc + (Number(curr.amount) * Number(curr.probability)) / 100,
      0
    );
    const wonRevenue = Number(wonRevenueSum._sum.amount || 0);

    // Dynamic Sales Funnel Calculation
    const convertedLeads = await prisma.lead.count({ where: { status: 'CONVERTED', deletedAt: null } });
    const proposalOpps = await prisma.opportunity.count({
      where: { stage: { code: 'PROPOSAL' }, deletedAt: null },
    });
    const wonOpps = await prisma.opportunity.count({ where: { status: 'WON', deletedAt: null } });

    const funnelData = [
      { stage: 'Total Leads', count: totalLeads },
      { stage: 'Qualified Leads', count: qualifiedLeads + convertedLeads },
      { stage: 'Opportunities Created', count: openOpportunities + wonOpps },
      { stage: 'Proposal Stage', count: proposalOpps },
      { stage: 'Deals Won', count: wonOpps },
    ];

    // Stage Distribution Chart
    const pipelineByStage = stages.map((s) => {
      const match = oppsByStage.find((o) => o.stageId === s.id);
      return {
        stageId: s.id.toString(),
        stageName: s.name,
        count: match ? match._count.id : 0,
        totalAmount: match && match._sum.amount ? Number(match._sum.amount) : 0,
      };
    });

    return {
      kpis: {
        totalLeads,
        newLeads,
        qualifiedLeads,
        openOpportunities,
        pipelineValue,
        weightedPipeline,
        wonRevenue,
        overdueTasks: overdueTasksCount,
      },
      funnel: funnelData,
      pipelineByStage,
      leadBySource: leadsBySource.map((ls) => ({
        source: ls.source,
        count: ls._count.id,
      })),
    };
  }

  public static async getLeaderDashboardStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. New Leads calculation
    const allNewLeads = await prisma.lead.findMany({
      where: { status: 'NEW', deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        phone: true,
        email: true,
        ownerId: true,
        createdAt: true,
      },
    });

    const leadIds = allNewLeads.map((l) => l.id);
    const activitiesForNewLeads = await prisma.activity.groupBy({
      by: ['relatedId'],
      where: {
        relatedType: 'LEAD',
        relatedId: { in: leadIds },
      },
      _count: { id: true },
    });

    const leadIdsWithActivity = new Set(activitiesForNewLeads.map((a) => a.relatedId.toString()));
    const unprocessedLeads = allNewLeads.filter((l) => !leadIdsWithActivity.has(l.id.toString()));
    const totalNewLeadsCount = allNewLeads.length;
    const unprocessedCount = unprocessedLeads.length;
    const processedCount = totalNewLeadsCount - unprocessedCount;

    // 2. Today's Follow-ups
    const todayTasks = await prisma.task.findMany({
      where: {
        dueAt: { gte: startOfToday, lte: endOfToday },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        assignedTo: true,
        dueAt: true,
      },
    });

    const totalTodayFollowups = todayTasks.length;
    const completedTodayFollowups = todayTasks.filter((t) => t.status === 'COMPLETED').length;
    const remainingTodayFollowups = totalTodayFollowups - completedTodayFollowups;

    // 3. Overdue Follow-ups
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueAt: { lt: startOfToday },
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        dueAt: true,
        assignedTo: true,
        relatedType: true,
        relatedId: true,
      },
      orderBy: { dueAt: 'asc' },
    });
    const overdueFollowupsCount = overdueTasks.length;

    // 4. Inactive Leads > 7 Days
    const activeLeads = await prisma.lead.findMany({
      where: {
        status: { notIn: ['CONVERTED', 'LOST'] },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        phone: true,
        email: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const leadActivityMaxDate = await prisma.activity.groupBy({
      by: ['relatedId'],
      where: { relatedType: 'LEAD' },
      _max: { createdAt: true },
    });

    const maxActMap = new Map<string, Date>();
    leadActivityMaxDate.forEach((a) => {
      if (a._max.createdAt) {
        maxActMap.set(a.relatedId.toString(), a._max.createdAt);
      }
    });

    const inactiveLeads = activeLeads.filter((l) => {
      const lastActDate = maxActMap.get(l.id.toString());
      const refDate = lastActDate || l.updatedAt || l.createdAt;
      return refDate < sevenDaysAgo;
    });
    const inactiveLeadsCount = inactiveLeads.length;

    // 5. Sales Rep Breakdown
    const salesUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: {
            role: { code: { in: ['SALES', 'MANAGER', 'ADMIN'] } },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: { id: 'asc' },
    });

    const salesReps = salesUsers.map((user) => {
      const userIdStr = user.id.toString();

      const userOverdueTasks = overdueTasks.filter(
        (t) => t.assignedTo && t.assignedTo.toString() === userIdStr
      );
      const userUnprocessedLeads = unprocessedLeads.filter(
        (l) => l.ownerId && l.ownerId.toString() === userIdStr
      );
      const userInactiveLeads = inactiveLeads.filter(
        (l) => l.ownerId && l.ownerId.toString() === userIdStr
      );
      const userTodayTasks = todayTasks.filter(
        (t) => t.assignedTo && t.assignedTo.toString() === userIdStr
      );
      const userTodayCompleted = userTodayTasks.filter((t) => t.status === 'COMPLETED').length;

      let alertStatus: 'CRITICAL' | 'WARNING' | 'GOOD' = 'GOOD';
      if (userOverdueTasks.length >= 5 || userInactiveLeads.length >= 5) {
        alertStatus = 'CRITICAL';
      } else if (
        userOverdueTasks.length > 0 ||
        userUnprocessedLeads.length > 0 ||
        userInactiveLeads.length > 0
      ) {
        alertStatus = 'WARNING';
      }

      return {
        id: userIdStr,
        name: `${user.lastName} ${user.firstName}`.trim(),
        email: user.email,
        phone: user.phone,
        overdueCount: userOverdueTasks.length,
        unprocessedCount: userUnprocessedLeads.length,
        inactiveCount: userInactiveLeads.length,
        todayTotal: userTodayTasks.length,
        todayCompleted: userTodayCompleted,
        alertStatus,
        overdueTasks: userOverdueTasks.map((t) => ({
          id: t.id.toString(),
          title: t.title,
          priority: t.priority,
          dueAt: t.dueAt,
          relatedType: t.relatedType,
          relatedId: t.relatedId.toString(),
        })),
        inactiveLeads: userInactiveLeads.map((l) => ({
          id: l.id.toString(),
          name: `${l.lastName} ${l.firstName}`.trim(),
          companyName: l.companyName,
          phone: l.phone,
          createdAt: l.createdAt,
        })),
      };
    });

    return {
      teamOverview: {
        newLeads: {
          total: totalNewLeadsCount,
          processed: processedCount,
          unprocessed: unprocessedCount,
        },
        todayFollowups: {
          total: totalTodayFollowups,
          completed: completedTodayFollowups,
          remaining: remainingTodayFollowups,
        },
        overdueFollowups: overdueFollowupsCount,
        inactiveLeads7Days: inactiveLeadsCount,
      },
      salesReps,
    };
  }

  public static async nudgeSalesRep(userId: string, customMessage?: string) {
    const userBigIntId = BigInt(userId);

    const user = await prisma.user.findUnique({
      where: { id: userBigIntId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const notification = await prisma.notification.create({
      data: {
        userId: userBigIntId,
        type: 'LEADER_NUDGE',
        title: '🔴 Nhắc nhở công việc từ Trưởng nhóm Sale',
        message:
          customMessage ||
          `Bạn có công việc follow-up quá hạn hoặc lead chưa xử lý. Vui lòng kiểm tra và ưu tiên hoàn thành ngay trong sáng nay!`,
      },
    });

    return {
      success: true,
      notificationId: notification.id.toString(),
      recipientName: `${user.lastName} ${user.firstName}`.trim(),
    };
  }
}

