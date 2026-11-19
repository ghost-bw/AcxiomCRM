import { Customer } from '../models/Customer.js';
import { User } from '../models/User.js';
import { Lead } from '../models/Lead.js';
import { Opportunity } from '../models/Opportunity.js';
import { FollowUp } from '../models/FollowUp.js';
import { Activity } from '../models/Activity.js';
import { AppError } from '../utils/apiResponse.js';
import { logAudit } from './auditService.js';
import { AUDIT_ACTIONS, ROLES } from '../constants/index.js';

// Helper to get allowed assignedTo IDs based on role
export const getAccessibleUserIds = async (user) => {
  if (user.role === ROLES.ADMIN) {
    return null; // All
  }
  if (user.role === ROLES.MANAGER) {
    const teamMembers = await User.find({ managerId: user.userId }).select('_id');
    const memberIds = teamMembers.map((m) => m._id.toString());
    memberIds.push(user.userId);
    return memberIds;
  }
  // Sales Executive: only own records
  return [user.userId];
};

const generateCustomerCode = async () => {
  const count = await Customer.countDocuments();
  const nextNum = 1000 + count + 1;
  return `CUST-${nextNum}`;
};

export const listCustomers = async (user, query) => {
  const { page = 1, limit = 10, search = '', status, assignedTo, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = { isDeleted: false };

  // Role Scope
  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds) {
    filter.assignedTo = { $in: accessibleIds };
  }

  // Filter by assignedTo if specifically passed (must still be within role scope)
  if (assignedTo) {
    if (accessibleIds && !accessibleIds.includes(assignedTo)) {
      throw new AppError('Unauthorized filter: You cannot view records outside your scope.', 403);
    }
    filter.assignedTo = assignedTo;
  }

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { customerCode: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10)),
    Customer.countDocuments(filter),
  ]);

  return {
    customers,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getCustomerById = async (id, user) => {
  const customer = await Customer.findOne({ _id: id, isDeleted: false })
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email');

  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  // IDOR & Scope check
  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(customer.assignedTo._id.toString())) {
    throw new AppError('Access denied: You are not authorized to access this customer record.', 403);
  }

  // Fetch related records
  const [leads, opportunities, followUps, activities] = await Promise.all([
    Lead.find({ 'convertedTo.customerId': customer._id, isDeleted: false }),
    Opportunity.find({ customer: customer._id, isDeleted: false }).populate('assignedTo', 'name email'),
    FollowUp.find({ relatedType: 'Customer', relatedId: customer._id, isDeleted: false }).sort({ followUpDate: 1 }),
    Activity.find({ customer: customer._id }).sort({ activityDate: -1 }),
  ]);

  return { customer, leads, opportunities, followUps, activities };
};

export const createCustomer = async (data, user, ipAddress = '') => {
  // Check duplicate email and phone
  const existingEmail = await Customer.findOne({ email: data.email, isDeleted: false });
  if (existingEmail) {
    throw new AppError('A customer with this email address already exists.', 409, [
      { field: 'email', message: 'Email address already exists.' },
    ]);
  }

  const existingPhone = await Customer.findOne({ phone: data.phone, isDeleted: false });
  if (existingPhone) {
    throw new AppError('A customer with this phone number already exists.', 409, [
      { field: 'phone', message: 'Phone number already exists.' },
    ]);
  }

  // Assign to: If Sales Executive, force assignedTo = user.userId
  let assignedTo = user.userId;
  if (data.assignedTo && user.role !== ROLES.SALES_EXECUTIVE) {
    assignedTo = data.assignedTo;
  }

  const customerCode = await generateCustomerCode();

  const customer = await Customer.create({
    ...data,
    customerCode,
    assignedTo,
    createdBy: user.userId,
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
    details: `Created customer ${customer.customerCode} - ${customer.name}`,
  });

  return customer;
};

export const updateCustomer = async (id, data, user, ipAddress = '') => {
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  // Scope check
  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(customer.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to modify this customer record.', 403);
  }

  // Check unique email and phone if changing
  if (data.email && data.email !== customer.email) {
    const existing = await Customer.findOne({ email: data.email, _id: { $ne: id }, isDeleted: false });
    if (existing) {
      throw new AppError('Email address is already used by another customer.', 409, [
        { field: 'email', message: 'Email already exists.' },
      ]);
    }
  }

  if (data.phone && data.phone !== customer.phone) {
    const existing = await Customer.findOne({ phone: data.phone, _id: { $ne: id }, isDeleted: false });
    if (existing) {
      throw new AppError('Phone number is already used by another customer.', 409, [
        { field: 'phone', message: 'Phone already exists.' },
      ]);
    }
  }

  // Sales executive cannot reassign customer owner
  if (data.assignedTo && user.role === ROLES.SALES_EXECUTIVE) {
    delete data.assignedTo;
  }

  const oldValue = customer.toJSON();
  Object.assign(customer, data);
  await customer.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.UPDATE,
    entityName: 'Customer',
    recordId: customer._id.toString(),
    oldValue,
    newValue: customer.toJSON(),
    ipAddress,
    details: `Updated customer ${customer.customerCode} - ${customer.name}`,
  });

  return customer;
};

export const deleteCustomer = async (id, user, ipAddress = '') => {
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  if (!customer) {
    throw new AppError('Customer not found.', 404);
  }

  const accessibleIds = await getAccessibleUserIds(user);
  if (accessibleIds && !accessibleIds.includes(customer.assignedTo.toString())) {
    throw new AppError('Access denied: You are not authorized to delete this customer record.', 403);
  }

  // Soft delete to preserve business history
  customer.isDeleted = true;
  await customer.save();

  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.DELETE,
    entityName: 'Customer',
    recordId: customer._id.toString(),
    oldValue: customer.toJSON(),
    ipAddress,
    details: `Deactivated/Soft deleted customer ${customer.customerCode} - ${customer.name}`,
  });

  return { message: 'Customer deactivated successfully.' };
};
