import { Lead } from '../models/Lead.js';
import { Customer } from '../models/Customer.js';
import { Opportunity } from '../models/Opportunity.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/apiResponse.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';
import { AUDIT_ACTIONS, LEAD_STATUS, OPPORTUNITY_STAGE, OPPORTUNITY_STATUS, ROLES } from '../constants/index.js';
import { getAccessibleUserIds } from './customerService.js';

const generateLeadCode = async () => {
  const count = await Lead.countDocuments();
  const nextNum = 1000 + count + 1;
  return `LEAD-${nextNum}`;
};

const generateCustomerCode = async () => {
  const count = await Customer.countDocuments();
  const nextNum = 1000 + count + 1;
  return `CUST-${nextNum}`;
};

const generateOpportunityCode = async () => {
  const count = await Opportunity.countDocuments();
  const nextNum = 1000 + count + 1;
  return `OPP-${nextNum}`;
};

export const listLeads = async (user, query) => {
  const { page = 1, limit = 10, search = '', status, priority, assignedTo, sortBy = 'createdAt', sortOrder = 'desc' } = query;

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
  if (priority) filter.priority = priority;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { leadCode: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('convertedTo.customerId', 'customerCode name')
      .populate('convertedTo.opportunityId', 'opportunityCode name amount')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Lead.countDocuments(filter),
  ]);

  return {
    leads,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getLeadById = async (id, user) => {
  const lead = await Lead.findOne({ _id: id, isDeleted: false })
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email')
    .populate('convertedTo.customerId')
    .populate('convertedTo.opportunityId');

  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(lead.assignedTo._id.toString())) {
    throw new AppError('Access denied: You are not authorized to access this lead record.', 403);
  }

  return lead;
};

export const createLead = async (data, user, ipAddress = '') => {
  let assignedTo = user.userId;
  if (data.assignedTo && user.role !== ROLES.SALES_EXECUTIVE) {
    assignedTo = data.assignedTo;
  }

  const leadCode = await generateLeadCode();

  const lead = await Lead.create({
    ...data,
    leadCode,
    assignedTo,
    createdBy: user.userId,
  });

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.CREATE,
    entityName: 'Lead',
    recordId: lead._id.toString(),
    newValue: lead.toJSON(),
    ipAddress,
    details: `Created lead ${lead.leadCode} - ${lead.name}`,
  });

  if (assignedTo !== user.userId) {
    await createNotification({
      recipient: assignedTo,
      title: 'New Lead Assigned',
      message: `${user.name} assigned lead '${lead.name}' to you.`,
      type: 'ASSIGNMENT',
      relatedEntity: 'Lead',
      relatedId: lead._id.toString(),
    });
  }

  return lead;
};

export const updateLead = async (id, data, user, ipAddress = '') => {
  const lead = await Lead.findOne({ _id: id, isDeleted: false });
  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(lead.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to modify this lead record.', 403);
  }

  if (lead.status === LEAD_STATUS.CONVERTED && data.status && data.status !== LEAD_STATUS.CONVERTED) {
    throw new AppError('Cannot change status of an already converted lead.', 400);
  }

  if (data.assignedTo && user.role === ROLES.SALES_EXECUTIVE) {
    delete data.assignedTo;
  }

  const oldValue = lead.toJSON();
  const previousStatus = lead.status;
  const previousAssigned = lead.assignedTo.toString();

  Object.assign(lead, data);
  await lead.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: data.status && data.status !== previousStatus ? AUDIT_ACTIONS.STATUS_CHANGE : AUDIT_ACTIONS.UPDATE,
    entityName: 'Lead',
    recordId: lead._id.toString(),
    oldValue,
    newValue: lead.toJSON(),
    ipAddress,
    details: `Updated lead ${lead.leadCode} - ${lead.name}`,
  });

  if (data.assignedTo && data.assignedTo !== previousAssigned) {
    await createNotification({
      recipient: data.assignedTo,
      title: 'Lead Reassigned',
      message: `Lead '${lead.name}' has been assigned to you.`,
      type: 'ASSIGNMENT',
      relatedEntity: 'Lead',
      relatedId: lead._id.toString(),
    });
  }

  return lead;
};

export const deleteLead = async (id, user, ipAddress = '') => {
  const lead = await Lead.findOne({ _id: id, isDeleted: false });
  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(lead.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to delete this lead record.', 403);
  }

  lead.isDeleted = true;
  await lead.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.DELETE,
    entityName: 'Lead',
    recordId: lead._id.toString(),
    oldValue: lead.toJSON(),
    ipAddress,
    details: `Deactivated lead ${lead.leadCode} - ${lead.name}`,
  });

  return { message: 'Lead deactivated successfully.' };
};

export const convertLead = async (id, data, user, ipAddress = '') => {
  const lead = await Lead.findOne({ _id: id, isDeleted: false });
  if (!lead) {
    throw new AppError('Lead not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(lead.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to convert this lead.', 403);
  }

  if (lead.status === LEAD_STATUS.CONVERTED) {
    throw new AppError('This lead has already been converted.', 400);
  }

  // Find or create customer
  let customer = await Customer.findOne({
    $or: [{ email: lead.email }, { phone: lead.phone }],
    isDeleted: false,
  });

  if (!customer) {
    const customerCode = await generateCustomerCode();
    customer = await Customer.create({
      customerCode,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName,
      assignedTo: lead.assignedTo,
      createdBy: user.userId,
      status: 'Active',
      notes: `Converted from Lead ${lead.leadCode}. ${lead.notes || ''}`.trim(),
    });

    await logAudit({
      userId: user.userId,
      userEmail: user.email,
      role: user.role,
      action: AUDIT_ACTIONS.CREATE,
      entityName: 'Customer',
      recordId: customer._id.toString(),
      newValue: customer.toJSON(),
      ipAddress,
      details: `Customer created from Lead conversion (${lead.leadCode})`,
    });
  }

  // Optionally create opportunity
  let opportunity = null;
  if (data.createOpportunity) {
    const opportunityAmount = data.opportunityAmount || (lead.expectedValue > 0 ? lead.expectedValue : 1000);
    const opportunityCode = await generateOpportunityCode();

    const closeDate = data.opportunityCloseDate
      ? new Date(data.opportunityCloseDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    opportunity = await Opportunity.create({
      opportunityCode,
      name: data.opportunityName || `${lead.name} - Deal`,
      customer: customer._id,
      lead: lead._id,
      amount: opportunityAmount,
      stage: data.opportunityStage || OPPORTUNITY_STAGE.QUALIFICATION,
      probability: 25,
      expectedCloseDate: closeDate,
      status: OPPORTUNITY_STATUS.OPEN,
      assignedTo: lead.assignedTo,
      createdBy: user.userId,
      notes: `Generated from converted lead ${lead.leadCode}`,
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
      details: `Opportunity created from Lead conversion (${lead.leadCode})`,
    });
  }

  // Mark lead as converted
  lead.status = LEAD_STATUS.CONVERTED;
  lead.convertedTo = {
    customerId: customer._id,
    opportunityId: opportunity ? opportunity._id : null,
    convertedAt: new Date(),
  };
  await lead.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.CONVERT,
    entityName: 'Lead',
    recordId: lead._id.toString(),
    newValue: lead.toJSON(),
    ipAddress,
    details: `Lead ${lead.leadCode} converted to Customer ${customer.customerCode}${
      opportunity ? ` and Opportunity ${opportunity.opportunityCode}` : ''
    }`,
  });

  return { lead, customer, opportunity };
};
