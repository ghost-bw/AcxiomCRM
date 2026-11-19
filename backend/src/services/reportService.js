import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { Opportunity } from '../models/Opportunity.js';
import { FollowUp } from '../models/FollowUp.js';
import { Activity } from '../models/Activity.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { getAccessibleUserIds } from './customerService.js';
import { LEAD_STATUS, OPPORTUNITY_STATUS, FOLLOWUP_STATUS, ROLES } from '../constants/index.js';
import { AppError } from '../utils/apiResponse.js';

// CSV Conversion helper
export const convertToCSV = (items, fields) => {
  if (!items || items.length === 0) return '';
  const header = fields.map((f) => `"${f.label}"`).join(',');
  const rows = items.map((item) =>
    fields
      .map((f) => {
        let val = item;
        const keys = f.key.split('.');
        for (const k of keys) {
          val = val ? val[k] : '';
        }
        if (val instanceof Date) val = val.toISOString().split('T')[0];
        const stringVal = val === null || val === undefined ? '' : String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      })
      .join(',')
  );
  return [header, ...rows].join('\n');
};

// 1. Customer Report
export const getCustomerReport = async (user, query) => {
  const { search, status, assignedTo, startDate, endDate } = query;
  const filter = { isDeleted: false };

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds) filter.assignedTo = { $in: accessibleIds };

  if (assignedTo) filter.assignedTo = assignedTo;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
    ];
  }
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const customers = await Customer.find(filter)
    .populate('assignedTo', 'name email role')
    .sort({ createdAt: -1 });

  return customers;
};

// 2. Lead Report
export const getLeadReport = async (user, query) => {
  const { search, status, priority, source, assignedTo, startDate, endDate } = query;
  const filter = { isDeleted: false };

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds) filter.assignedTo = { $in: accessibleIds };

  if (assignedTo) filter.assignedTo = assignedTo;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (source) filter.source = source;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
    ];
  }
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const leads = await Lead.find(filter)
    .populate('assignedTo', 'name email')
    .populate('convertedTo.customerId', 'customerCode name')
    .sort({ createdAt: -1 });

  return leads;
};

// 3. Follow-Up Report
export const getFollowUpReport = async (user, query) => {
  const { status, followUpType, assignedTo, startDate, endDate } = query;
  const filter = { isDeleted: false };

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds) filter.assignedTo = { $in: accessibleIds };

  if (assignedTo) filter.assignedTo = assignedTo;
  if (status) filter.status = status;
  if (followUpType) filter.followUpType = followUpType;

  if (startDate && endDate) {
    filter.followUpDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const followUps = await FollowUp.find(filter)
    .populate('assignedTo', 'name email')
    .sort({ followUpDate: 1 });

  return followUps;
};

// 4. Opportunity Report
export const getOpportunityReport = async (user, query) => {
  const { stage, status, assignedTo, startDate, endDate } = query;
  const filter = { isDeleted: false };

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds) filter.assignedTo = { $in: accessibleIds };

  if (assignedTo) filter.assignedTo = assignedTo;
  if (stage) filter.stage = stage;
  if (status) filter.status = status;

  if (startDate && endDate) {
    filter.expectedCloseDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const opportunities = await Opportunity.find(filter)
    .populate('customer', 'customerCode name companyName')
    .populate('assignedTo', 'name email')
    .sort({ expectedCloseDate: 1 });

  return opportunities;
};

// 5. Pipeline Report (Stage-wise & Owner-wise)
export const getPipelineReport = async (user) => {
  const accessibleIds = await getAccessibleUserIds(user);
  const match = { isDeleted: false };
  if (accessibleIds) {
    match.assignedTo = { $in: accessibleIds.map((id) => new User.base.Types.ObjectId(id)) };
  }

  const [byStage, byOwner] = await Promise.all([
    Opportunity.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          weightedAmount: {
            $sum: { $divide: [{ $multiply: ['$amount', '$probability'] }, 100] },
          },
        },
      },
    ]),
    Opportunity.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$assignedTo',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          weightedAmount: {
            $sum: { $divide: [{ $multiply: ['$amount', '$probability'] }, 100] },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'owner',
        },
      },
      { $unwind: '$owner' },
      {
        $project: {
          ownerId: '$_id',
          ownerName: '$owner.name',
          ownerEmail: '$owner.email',
          count: 1,
          totalAmount: 1,
          weightedAmount: 1,
        },
      },
    ]),
  ]);

  return { byStage, byOwner };
};

// 6. Sales & Conversion Report
export const getConversionReport = async (user, query) => {
  const accessibleIds = await getAccessibleUserIds(user);
  const matchLead = { isDeleted: false };
  const matchOpp = { isDeleted: false };

  if (accessibleIds) {
    matchLead.assignedTo = { $in: accessibleIds.map((id) => new User.base.Types.ObjectId(id)) };
    matchOpp.assignedTo = { $in: accessibleIds.map((id) => new User.base.Types.ObjectId(id)) };
  }

  const [totalLeads, convertedLeads, oppOutcomes] = await Promise.all([
    Lead.countDocuments(matchLead),
    Lead.countDocuments({ ...matchLead, status: LEAD_STATUS.CONVERTED }),
    Opportunity.aggregate([
      { $match: matchOpp },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const unconvertedLeads = totalLeads - convertedLeads;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;

  return {
    totalLeads,
    convertedLeads,
    unconvertedLeads,
    conversionRate: `${conversionRate}%`,
    opportunityOutcomes: oppOutcomes,
  };
};

// 7. User Activity Report
export const getUserActivityReport = async (currentUser) => {
  if (currentUser.role === ROLES.SALES_EXECUTIVE) {
    throw new AppError('Access denied: Sales Executives cannot view user activity reports.', 403);
  }

  let userMatch = { isActive: true };
  if (currentUser.role === ROLES.MANAGER) {
    userMatch.$or = [{ _id: currentUser.userId }, { managerId: currentUser.userId }];
  }

  const users = await User.find(userMatch).select('name email role');
  const userIds = users.map((u) => u._id);

  const activityStats = await Activity.aggregate([
    { $match: { assignedTo: { $in: userIds } } },
    {
      $group: {
        _id: { assignedTo: '$assignedTo', activityType: '$activityType' },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = users.map((u) => {
    const userStats = activityStats.filter((s) => s._id.assignedTo.toString() === u._id.toString());
    const byType = Object.fromEntries(userStats.map((s) => [s._id.activityType, s.count]));
    const total = userStats.reduce((sum, s) => sum + s.count, 0);

    return {
      userId: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      totalActivities: total,
      calls: byType['Call'] || 0,
      meetings: byType['Meeting'] || 0,
      emails: byType['Email'] || 0,
      tasks: byType['Task'] || 0,
    };
  });

  return result;
};

// 8. Audit Report
export const getAuditReport = async (currentUser, query) => {
  if (currentUser.role === ROLES.SALES_EXECUTIVE) {
    throw new AppError('Access denied: Sales Executives cannot view audit logs.', 403);
  }

  const { search, action, entityName, userEmail, startDate, endDate, page = 1, limit = 50 } = query;

  const filter = {};
  if (action) filter.action = action;
  if (entityName) filter.entityName = entityName;
  if (userEmail) filter.userEmail = { $regex: userEmail, $options: 'i' };

  if (search) {
    filter.$or = [
      { details: { $regex: search, $options: 'i' } },
      { userEmail: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } },
      { entityName: { $regex: search, $options: 'i' } },
    ];
  }

  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};
