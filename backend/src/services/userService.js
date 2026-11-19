import { User } from '../models/User.js';
import { hashPassword } from '../utils/passwordUtils.js';
import { AppError } from '../utils/apiResponse.js';
import { logAudit } from './auditService.js';
import { AUDIT_ACTIONS, ROLES } from '../constants/index.js';

export const listUsers = async (query) => {
  const { page = 1, limit = 10, search = '', role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined && isActive !== '') filter.isActive = isActive === 'true';

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('managerId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10)),
    User.countDocuments(filter),
  ]);

  return {
    users,
    meta: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getUserById = async (id) => {
  const user = await User.findById(id).populate('managerId', 'name email');
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return user;
};

export const createUser = async (data, adminUser, ipAddress = '') => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw new AppError('A user with this email address already exists.', 409, [
      { field: 'email', message: 'Email already exists.' },
    ]);
  }

  const passwordHash = await hashPassword(data.password);

  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role || ROLES.SALES_EXECUTIVE,
    managerId: data.managerId || null,
    isActive: data.isActive !== undefined ? data.isActive : true,
  });

  await logAudit({
    userId: adminUser.userId,
    userEmail: adminUser.email,
    role: adminUser.role,
    action: AUDIT_ACTIONS.CREATE,
    entityName: 'User',
    recordId: user._id.toString(),
    newValue: user.toJSON(),
    ipAddress,
    details: `Admin created user '${user.name}' with role ${user.role}`,
  });

  return user;
};

export const updateUser = async (id, data, adminUser, ipAddress = '') => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === adminUser.userId && data.isActive === false) {
    throw new AppError('Administrators cannot deactivate their own account.', 400);
  }

  if (data.email && data.email !== user.email) {
    const existing = await User.findOne({ email: data.email, _id: { $ne: id } });
    if (existing) {
      throw new AppError('Email address is already in use by another account.', 409, [
        { field: 'email', message: 'Email already exists.' },
      ]);
    }
  }

  const oldValue = user.toJSON();
  const previousRole = user.role;

  if (data.name) user.name = data.name;
  if (data.email) user.email = data.email;
  if (data.role) user.role = data.role;
  if (data.managerId !== undefined) user.managerId = data.managerId;
  if (data.isActive !== undefined) user.isActive = data.isActive;
  if (data.password) {
    user.passwordHash = await hashPassword(data.password);
  }

  await user.save();

  await logAudit({
    userId: adminUser.userId,
    userEmail: adminUser.email,
    role: adminUser.role,
    action: data.role && data.role !== previousRole ? AUDIT_ACTIONS.ROLE_CHANGE : AUDIT_ACTIONS.UPDATE,
    entityName: 'User',
    recordId: user._id.toString(),
    oldValue,
    newValue: user.toJSON(),
    ipAddress,
    details: `Admin updated user '${user.name}'`,
  });

  return user;
};

export const unlockUser = async (id, adminUser, ipAddress = '') => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  user.failedLoginCount = 0;
  user.lockoutUntil = null;
  await user.save();

  await logAudit({
    userId: adminUser.userId,
    userEmail: adminUser.email,
    role: adminUser.role,
    action: AUDIT_ACTIONS.UNLOCK,
    entityName: 'User',
    recordId: user._id.toString(),
    ipAddress,
    details: `Admin unlocked account for user '${user.name}'`,
  });

  return { message: 'User account unlocked successfully.' };
};

export const getAssignees = async (currentUser) => {
  if (currentUser.role === ROLES.ADMIN) {
    return User.find({ isActive: true }).select('name email role');
  }
  if (currentUser.role === ROLES.MANAGER) {
    return User.find({
      isActive: true,
      $or: [{ _id: currentUser.userId }, { managerId: currentUser.userId }],
    }).select('name email role');
  }
  return User.find({ _id: currentUser.userId }).select('name email role');
};
