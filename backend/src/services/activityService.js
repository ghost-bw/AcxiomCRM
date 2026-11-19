import { Activity } from '../models/Activity.js';
import { AppError } from '../utils/apiResponse.js';
import { logAudit } from './auditService.js';
import { AUDIT_ACTIONS } from '../constants/index.js';
import { getAccessibleUserIds } from './customerService.js';

export const listActivities = async (user, query) => {
  const {
    page = 1,
    limit = 10,
    activityType,
    status,
    customer,
    lead,
    assignedTo,
    sortBy = 'activityDate',
    sortOrder = 'desc',
  } = query;

  const filter = {};

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds) {
    filter.assignedTo = { $in: accessibleIds };
  }

  if (assignedTo) {
    if (accessibleIds && !accessibleIds.includes(assignedTo)) {
      throw new AppError('Unauthorized filter: You cannot view records outside your scope.', 403);
    }
    filter.assignedTo = assignedTo;
  }

  if (activityType) filter.activityType = activityType;
  if (status) filter.status = status;
  if (customer) filter.customer = customer;
  if (lead) filter.lead = lead;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [activities, total] = await Promise.all([
    Activity.find(filter)
      .populate('customer', 'customerCode name companyName')
      .populate('lead', 'leadCode name companyName')
      .populate('opportunity', 'opportunityCode name amount')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Activity.countDocuments(filter),
  ]);

  return {
    activities,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const createActivity = async (data, user, ipAddress = '') => {
  let assignedTo = user.userId;
  if (data.assignedTo && user.role !== 'Sales Executive') {
    assignedTo = data.assignedTo;
  }

  const activity = await Activity.create({
    ...data,
    assignedTo,
    createdBy: user.userId,
    activityDate: data.activityDate ? new Date(data.activityDate) : new Date(),
  });

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.CREATE,
    entityName: 'Activity',
    recordId: activity._id.toString(),
    newValue: activity.toJSON(),
    ipAddress,
    details: `Logged ${activity.activityType} activity: '${activity.subject}'`,
  });

  return activity;
};

export const updateActivity = async (id, data, user, ipAddress = '') => {
  const activity = await Activity.findById(id);
  if (!activity) {
    throw new AppError('Activity not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(activity.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to modify this activity.', 403);
  }

  const oldValue = activity.toJSON();
  Object.assign(activity, data);
  await activity.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.UPDATE,
    entityName: 'Activity',
    recordId: activity._id.toString(),
    oldValue,
    newValue: activity.toJSON(),
    ipAddress,
    details: `Updated activity '${activity.subject}'`,
  });

  return activity;
};
