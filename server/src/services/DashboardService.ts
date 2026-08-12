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
}
