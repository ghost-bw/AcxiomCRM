import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { Opportunity } from '../models/Opportunity.js';
import { FollowUp } from '../models/FollowUp.js';
import { Activity } from '../models/Activity.js';
import { User } from '../models/User.js';
import { getAccessibleUserIds } from './customerService.js';
import { LEAD_STATUS, OPPORTUNITY_STAGE, OPPORTUNITY_STATUS, FOLLOWUP_STATUS, ROLES } from '../constants/index.js';

export const getDashboardMetrics = async (user, query = {}) => {
  const { dateRange = 'All Time', startDate, endDate } = query;

  const accessibleIds = await getAccessibleUserIds(user);

  // Build date filter
  let dateFilter = {};
  const now = new Date();

  if (dateRange === 'Today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    dateFilter = { $gte: start, $lte: end };
  } else if (dateRange === 'This Week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    dateFilter = { $gte: start };
  } else if (dateRange === 'This Month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    dateFilter = { $gte: start };
  } else if (dateRange === 'Custom' && startDate && endDate) {
    dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const baseCustomerFilter = { isDeleted: false };
  const baseLeadFilter = { isDeleted: false };
  const baseOppFilter = { isDeleted: false };
  const baseFollowUpFilter = { isDeleted: false };
  const baseActivityFilter = {};

  if (accessibleIds) {
    baseCustomerFilter.assignedTo = { $in: accessibleIds };
    baseLeadFilter.assignedTo = { $in: accessibleIds };
    baseOppFilter.assignedTo = { $in: accessibleIds };
    baseFollowUpFilter.assignedTo = { $in: accessibleIds };
    baseActivityFilter.assignedTo = { $in: accessibleIds };
  }

  if (Object.keys(dateFilter).length > 0) {
    baseCustomerFilter.createdAt = dateFilter;
    baseLeadFilter.createdAt = dateFilter;
    baseOppFilter.createdAt = dateFilter;
    baseFollowUpFilter.createdAt = dateFilter;
    baseActivityFilter.createdAt = dateFilter;
  }

  // 1. KPI Counts
  const [
    totalCustomers,
    totalLeads,
    openLeads,
    totalOpportunities,
    openOpportunities,
    wonOpportunities,
    lostOpportunities,
    oppStats,
    totalUsersCount,
    activeUsersCount,
  ] = await Promise.all([
    Customer.countDocuments(baseCustomerFilter),
    Lead.countDocuments(baseLeadFilter),
    Lead.countDocuments({
      ...baseLeadFilter,
      status: { $nin: [LEAD_STATUS.CONVERTED, LEAD_STATUS.LOST] },
    }),
    Opportunity.countDocuments(baseOppFilter),
    Opportunity.countDocuments({ ...baseOppFilter, status: OPPORTUNITY_STATUS.OPEN }),
    Opportunity.countDocuments({ ...baseOppFilter, status: OPPORTUNITY_STATUS.WON }),
    Opportunity.countDocuments({ ...baseOppFilter, status: OPPORTUNITY_STATUS.LOST }),
    Opportunity.aggregate([
      { $match: { ...baseOppFilter, status: OPPORTUNITY_STATUS.OPEN } },
      {
        $group: {
          _id: null,
          totalPipelineValue: { $sum: '$amount' },
          weightedPipelineValue: {
            $sum: { $divide: [{ $multiply: ['$amount', '$probability'] }, 100] },
          },
        },
      },
    ]),
    user.role === ROLES.ADMIN ? User.countDocuments() : Promise.resolve(0),
    user.role === ROLES.ADMIN ? User.countDocuments({ isActive: true }) : Promise.resolve(0),
  ]);

  const pipelineValue = oppStats.length > 0 ? oppStats[0].totalPipelineValue : 0;
  const weightedPipelineValue = oppStats.length > 0 ? Math.round(oppStats[0].weightedPipelineValue) : 0;

  // 2. Chart: Lead Status Breakdown
  const leadStatuses = Object.values(LEAD_STATUS);
  const leadStatusCountsRaw = await Lead.aggregate([
    { $match: baseLeadFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const leadStatusMap = Object.fromEntries(leadStatusCountsRaw.map((item) => [item._id, item.count]));
  const leadStatusChart = leadStatuses.map((status) => ({
    status,
    count: leadStatusMap[status] || 0,
  }));

  // 3. Chart: Opportunity Pipeline by Stage
  const oppStages = Object.values(OPPORTUNITY_STAGE);
  const oppStageAgg = await Opportunity.aggregate([
    { $match: baseOppFilter },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$amount' },
        weightedValue: {
          $sum: { $divide: [{ $multiply: ['$amount', '$probability'] }, 100] },
        },
      },
    },
  ]);

  const oppStageMap = Object.fromEntries(oppStageAgg.map((item) => [item._id, item]));
  const opportunityPipelineChart = oppStages.map((stage) => ({
    stage,
    count: oppStageMap[stage]?.count || 0,
    totalValue: oppStageMap[stage]?.totalValue || 0,
    weightedValue: Math.round(oppStageMap[stage]?.weightedValue || 0),
  }));

  // 4. Chart: Monthly Sales and Pipeline (Last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyOppAgg = await Opportunity.aggregate([
    {
      $match: {
        isDeleted: false,
        ...(accessibleIds && { assignedTo: { $in: accessibleIds } }),
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        wonSales: {
          $sum: {
            $cond: [{ $eq: ['$status', OPPORTUNITY_STATUS.WON] }, '$amount', 0],
          },
        },
        totalCreatedValue: { $sum: '$amount' },
        wonCount: {
          $sum: {
            $cond: [{ $eq: ['$status', OPPORTUNITY_STATUS.WON] }, 1, 0],
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlySalesChart = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const key = `${monthNames[mo - 1]} ${yr}`;

    const match = monthlyOppAgg.find((m) => m._id.year === yr && m._id.month === mo);
    monthlySalesChart.push({
      month: key,
      wonSales: match?.wonSales || 0,
      pipelineValue: match?.totalCreatedValue || 0,
      wonCount: match?.wonCount || 0,
    });
  }

  // 5. Follow-Ups: Upcoming & Overdue
  const startOfCurrentDay = new Date();
  startOfCurrentDay.setHours(0, 0, 0, 0);

  const [upcomingFollowUps, overdueFollowUps, recentCustomers, recentLeads, recentActivities] =
    await Promise.all([
      FollowUp.find({
        isDeleted: false,
        ...(accessibleIds && { assignedTo: { $in: accessibleIds } }),
        status: FOLLOWUP_STATUS.PLANNED,
        followUpDate: { $gte: startOfCurrentDay },
      })
        .populate('assignedTo', 'name email')
        .sort({ followUpDate: 1 })
        .limit(5),
      FollowUp.find({
        isDeleted: false,
        ...(accessibleIds && { assignedTo: { $in: accessibleIds } }),
        status: FOLLOWUP_STATUS.PLANNED,
        followUpDate: { $lt: startOfCurrentDay },
      })
        .populate('assignedTo', 'name email')
        .sort({ followUpDate: 1 })
        .limit(5),
      Customer.find({
        isDeleted: false,
        ...(accessibleIds && { assignedTo: { $in: accessibleIds } }),
      })
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
      Lead.find({
        isDeleted: false,
        ...(accessibleIds && { assignedTo: { $in: accessibleIds } }),
      })
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
      Activity.find({
        ...(accessibleIds && { assignedTo: { $in: accessibleIds } }),
      })
        .populate('assignedTo', 'name')
        .sort({ activityDate: -1 })
        .limit(5),
    ]);

  return {
    kpis: {
      totalCustomers,
      totalLeads,
      openLeads,
      totalOpportunities,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      totalPipelineValue: pipelineValue,
      weightedPipelineValue,
      ...(user.role === ROLES.ADMIN && {
        totalUsers: totalUsersCount,
        activeUsers: activeUsersCount,
      }),
    },
    charts: {
      leadStatusChart,
      opportunityPipelineChart,
      monthlySalesChart,
    },
    recent: {
      upcomingFollowUps,
      overdueFollowUps,
      recentCustomers,
      recentLeads,
      recentActivities,
    },
  };
};
