import { Opportunity } from '../models/Opportunity.js';
import { Customer } from '../models/Customer.js';
import { AppError } from '../utils/apiResponse.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';
import { AUDIT_ACTIONS, OPPORTUNITY_STAGE, OPPORTUNITY_STATUS, ROLES } from '../constants/index.js';
import { getAccessibleUserIds } from './customerService.js';

const generateOpportunityCode = async () => {
  const count = await Opportunity.countDocuments();
  const nextNum = 1000 + count + 1;
  return `OPP-${nextNum}`;
};

export const listOpportunities = async (user, query) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    stage,
    status,
    customer,
    assignedTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
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

  if (stage) filter.stage = stage;
  if (status) filter.status = status;
  if (customer) filter.customer = customer;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { opportunityCode: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [opportunities, total] = await Promise.all([
    Opportunity.find(filter)
      .populate('customer', 'customerCode name companyName email phone')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('lead', 'leadCode name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Opportunity.countDocuments(filter),
  ]);

  return {
    opportunities,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getOpportunityById = async (id, user) => {
  const opportunity = await Opportunity.findOne({ _id: id, isDeleted: false })
    .populate('customer')
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email')
    .populate('lead');

  if (!opportunity) {
    throw new AppError('Opportunity not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(opportunity.assignedTo._id.toString())) {
    throw new AppError('Access denied: You are not authorized to access this opportunity.', 403);
  }

  return opportunity;
};

export const createOpportunity = async (data, user, ipAddress = '') => {
  // Business validation 1: Amount must be greater than 0
  if (data.amount <= 0) {
    throw new AppError('Opportunity Amount must be greater than 0.', 400, [
      { field: 'amount', message: 'Opportunity Amount must be greater than 0.' },
    ]);
  }

  // Business validation 2: Probability must be between 0 and 100
  if (data.probability < 0 || data.probability > 100) {
    throw new AppError('Probability must be between 0 and 100.', 400, [
      { field: 'probability', message: 'Probability must be between 0 and 100.' },
    ]);
  }

  // Business validation 3: Expected close date cannot be in past for active opportunity
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const closeDate = new Date(data.expectedCloseDate);
  if (data.stage !== OPPORTUNITY_STAGE.WON && data.stage !== OPPORTUNITY_STAGE.LOST && closeDate < today) {
    throw new AppError('Expected Close Date cannot be in the past for an active Opportunity.', 400, [
      { field: 'expectedCloseDate', message: 'Expected Close Date cannot be in the past.' },
    ]);
  }

  // Verify customer exists
  const customer = await Customer.findOne({ _id: data.customer, isDeleted: false });
  if (!customer) {
    throw new AppError('Referenced customer does not exist.', 404);
  }

  let assignedTo = user.userId;
  if (data.assignedTo && user.role !== ROLES.SALES_EXECUTIVE) {
    assignedTo = data.assignedTo;
  }

  let status = OPPORTUNITY_STATUS.OPEN;
  if (data.stage === OPPORTUNITY_STAGE.WON) status = OPPORTUNITY_STATUS.WON;
  if (data.stage === OPPORTUNITY_STAGE.LOST) status = OPPORTUNITY_STATUS.LOST;

  const opportunityCode = await generateOpportunityCode();

  const opportunity = await Opportunity.create({
    ...data,
    status,
    opportunityCode,
    assignedTo,
    createdBy: user.userId,
  });

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.CREATE,
    entityName: 'Opportunity',
    recordId: opportunity._id.toString(),
    newValue: opportunity.toJSON(),
    ipAddress,
    details: `Created opportunity ${opportunity.opportunityCode} - ${opportunity.name} ($${opportunity.amount})`,
  });

  if (assignedTo !== user.userId) {
    await createNotification({
      recipient: assignedTo,
      title: 'Opportunity Assigned',
      message: `${user.name} assigned opportunity '${opportunity.name}' to you.`,
      type: 'ASSIGNMENT',
      relatedEntity: 'Opportunity',
      relatedId: opportunity._id.toString(),
    });
  }

  return opportunity;
};

export const updateOpportunity = async (id, data, user, ipAddress = '') => {
  const opportunity = await Opportunity.findOne({ _id: id, isDeleted: false });
  if (!opportunity) {
    throw new AppError('Opportunity not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(opportunity.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to modify this opportunity.', 403);
  }

  if (data.amount !== undefined && data.amount <= 0) {
    throw new AppError('Opportunity Amount must be greater than 0.', 400);
  }

  if (data.probability !== undefined && (data.probability < 0 || data.probability > 100)) {
    throw new AppError('Probability must be between 0 and 100.', 400);
  }

  const currentStage = data.stage || opportunity.stage;
  if (data.expectedCloseDate && currentStage !== OPPORTUNITY_STAGE.WON && currentStage !== OPPORTUNITY_STAGE.LOST) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const closeDate = new Date(data.expectedCloseDate);
    if (closeDate < today) {
      throw new AppError('Expected Close Date cannot be in the past for an active Opportunity.', 400);
    }
  }

  if (data.assignedTo && user.role === ROLES.SALES_EXECUTIVE) {
    delete data.assignedTo;
  }

  // Update status automatically if stage changes
  if (data.stage) {
    if (data.stage === OPPORTUNITY_STAGE.WON) data.status = OPPORTUNITY_STATUS.WON;
    else if (data.stage === OPPORTUNITY_STAGE.LOST) data.status = OPPORTUNITY_STATUS.LOST;
    else data.status = OPPORTUNITY_STATUS.OPEN;
  }

  const oldValue = opportunity.toJSON();
  const previousStage = opportunity.stage;

  Object.assign(opportunity, data);
  await opportunity.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: data.stage && data.stage !== previousStage ? AUDIT_ACTIONS.STAGE_CHANGE : AUDIT_ACTIONS.UPDATE,
    entityName: 'Opportunity',
    recordId: opportunity._id.toString(),
    oldValue,
    newValue: opportunity.toJSON(),
    ipAddress,
    details: `Updated opportunity ${opportunity.opportunityCode} (Stage: ${opportunity.stage})`,
  });

  return opportunity;
};

export const deleteOpportunity = async (id, user, ipAddress = '') => {
  const opportunity = await Opportunity.findOne({ _id: id, isDeleted: false });
  if (!opportunity) {
    throw new AppError('Opportunity not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(opportunity.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to delete this opportunity.', 403);
  }

  opportunity.isDeleted = true;
  await opportunity.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.DELETE,
    entityName: 'Opportunity',
    recordId: opportunity._id.toString(),
    oldValue: opportunity.toJSON(),
    ipAddress,
    details: `Deactivated opportunity ${opportunity.opportunityCode} - ${opportunity.name}`,
  });

  return { message: 'Opportunity deactivated successfully.' };
};
