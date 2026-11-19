import { FollowUp } from '../models/FollowUp.js';
import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { Opportunity } from '../models/Opportunity.js';
import { AppError } from '../utils/apiResponse.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';
import { AUDIT_ACTIONS, FOLLOWUP_STATUS, ROLES } from '../constants/index.js';
import { getAccessibleUserIds } from './customerService.js';

export const listFollowUps = async (user, query) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    followUpType,
    assignedTo,
    relatedType,
    relatedId,
    filterType, // 'upcoming', 'overdue', 'today', 'pending'
    sortBy = 'followUpDate',
    sortOrder = 'asc',
  } = query;

  const filter = { isDeleted: false };

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

  if (status) filter.status = status;
  if (followUpType) filter.followUpType = followUpType;
  if (relatedType) filter.relatedType = relatedType;
  if (relatedId) filter.relatedId = relatedId;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  if (filterType === 'overdue') {
    filter.status = FOLLOWUP_STATUS.PLANNED;
    filter.followUpDate = { $lt: startOfToday };
  } else if (filterType === 'upcoming') {
    filter.status = FOLLOWUP_STATUS.PLANNED;
    filter.followUpDate = { $gte: startOfToday };
  } else if (filterType === 'today') {
    filter.status = FOLLOWUP_STATUS.PLANNED;
    filter.followUpDate = { $gte: startOfToday, $lte: endOfToday };
  } else if (filterType === 'pending') {
    filter.status = FOLLOWUP_STATUS.PLANNED;
  }

  if (search) {
    filter.subject = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [followUps, total] = await Promise.all([
    FollowUp.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10)),
    FollowUp.countDocuments(filter),
  ]);

  // Manually attach related entity titles for rich display
  const enrichedFollowUps = await Promise.all(
    followUps.map(async (f) => {
      const obj = f.toJSON();
      if (f.relatedType === 'Customer') {
        const c = await Customer.findById(f.relatedId).select('name customerCode companyName');
        obj.relatedEntity = c;
      } else if (f.relatedType === 'Lead') {
        const l = await Lead.findById(f.relatedId).select('name leadCode companyName');
        obj.relatedEntity = l;
      } else if (f.relatedType === 'Opportunity') {
        const o = await Opportunity.findById(f.relatedId).select('name opportunityCode amount');
        obj.relatedEntity = o;
      }
      return obj;
    })
  );

  return {
    followUps: enrichedFollowUps,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getFollowUpById = async (id, user) => {
  const followUp = await FollowUp.findOne({ _id: id, isDeleted: false })
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email');

  if (!followUp) {
    throw new AppError('Follow-up not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(followUp.assignedTo._id.toString())) {
    throw new AppError('Access denied: You are not authorized to access this follow-up.', 403);
  }

  return followUp;
};

export const createFollowUp = async (data, user, ipAddress = '') => {
  // Business rule: Follow-up date cannot be earlier than today for a new/planned follow-up
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fDate = new Date(data.followUpDate);

  if (data.status === FOLLOWUP_STATUS.PLANNED && fDate < today) {
    throw new AppError('Follow-up date cannot be earlier than today for a new/planned follow-up.', 400, [
      { field: 'followUpDate', message: 'Follow-up date cannot be earlier than today.' },
    ]);
  }

  let assignedTo = user.userId;
  if (data.assignedTo && user.role !== ROLES.SALES_EXECUTIVE) {
    assignedTo = data.assignedTo;
  }

  const followUp = await FollowUp.create({
    ...data,
    assignedTo,
    createdBy: user.userId,
  });

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.CREATE,
    entityName: 'FollowUp',
    recordId: followUp._id.toString(),
    newValue: followUp.toJSON(),
    ipAddress,
    details: `Scheduled ${followUp.followUpType} follow-up: '${followUp.subject}' on ${new Date(
      followUp.followUpDate
    ).toLocaleDateString()}`,
  });

  if (assignedTo !== user.userId) {
    await createNotification({
      recipient: assignedTo,
      title: 'Follow-Up Scheduled',
      message: `${user.name} scheduled a ${followUp.followUpType} follow-up for you: '${followUp.subject}'`,
      type: 'FOLLOW_UP_REMINDER',
      relatedEntity: 'FollowUp',
      relatedId: followUp._id.toString(),
    });
  }

  return followUp;
};

export const updateFollowUp = async (id, data, user, ipAddress = '') => {
  const followUp = await FollowUp.findOne({ _id: id, isDeleted: false });
  if (!followUp) {
    throw new AppError('Follow-up not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(followUp.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to modify this follow-up.', 403);
  }

  const oldValue = followUp.toJSON();
  const isRescheduled = data.followUpDate && new Date(data.followUpDate).getTime() !== new Date(followUp.followUpDate).getTime();

  if (data.status === FOLLOWUP_STATUS.COMPLETED && followUp.status !== FOLLOWUP_STATUS.COMPLETED) {
    data.completedAt = new Date();
  }

  if (data.assignedTo && user.role === ROLES.SALES_EXECUTIVE) {
    delete data.assignedTo;
  }

  Object.assign(followUp, data);
  await followUp.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: isRescheduled ? AUDIT_ACTIONS.RESCHEDULE : AUDIT_ACTIONS.UPDATE,
    entityName: 'FollowUp',
    recordId: followUp._id.toString(),
    oldValue,
    newValue: followUp.toJSON(),
    ipAddress,
    details: isRescheduled
      ? `Rescheduled follow-up to ${new Date(followUp.followUpDate).toLocaleDateString()}`
      : `Updated follow-up status to ${followUp.status}`,
  });

  return followUp;
};

export const updateFollowUpStatus = async (id, status, user, remarks = '', ipAddress = '') => {
  const followUp = await FollowUp.findOne({ _id: id, isDeleted: false });
  if (!followUp) {
    throw new AppError('Follow-up not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(followUp.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to update this follow-up.', 403);
  }

  const oldValue = followUp.toJSON();
  followUp.status = status;
  if (status === FOLLOWUP_STATUS.COMPLETED) {
    followUp.completedAt = new Date();
  }
  if (remarks) {
    followUp.remarks = remarks;
  }
  await followUp.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.STATUS_CHANGE,
    entityName: 'FollowUp',
    recordId: followUp._id.toString(),
    oldValue,
    newValue: followUp.toJSON(),
    ipAddress,
    details: `Changed follow-up status to ${status}`,
  });

  return followUp;
};
