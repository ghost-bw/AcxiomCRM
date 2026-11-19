import crypto from 'crypto';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/passwordUtils.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils.js';
import { AppError } from '../utils/apiResponse.js';
import { ENV } from '../config/env.js';
import { logAudit } from './auditService.js';
import { AUDIT_ACTIONS, ROLES } from '../constants/index.js';

export const registerUser = async ({ name, email, password }, ipAddress = '') => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email address is already registered', 409, [
      { field: 'email', message: 'Email address is already in use.' },
    ]);
  }

  const passwordHash = await hashPassword(password);

  // Security requirement: public registration NEVER allows Admin role
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: ROLES.SALES_EXECUTIVE,
    isActive: true,
  });

  await logAudit({
    userId: user._id,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.CREATE,
    entityName: 'User',
    recordId: user._id.toString(),
    newValue: { name: user.name, email: user.email, role: user.role },
    ipAddress,
    details: 'User self-registered as Sales Executive',
  });

  const payload = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save();

  return { user, accessToken, refreshToken };
};

export const loginUser = async ({ email, password }, ipAddress = '') => {
  const user = await User.findOne({ email }).select('+passwordHash +refreshToken');

  if (!user) {
    await logAudit({
      userEmail: email,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityName: 'Authentication',
      ipAddress,
      result: 'FAILURE',
      details: 'Login attempt with non-existent email',
    });
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account has been deactivated. Please contact an administrator.', 403);
  }

  // Check Account Lockout
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
    await logAudit({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityName: 'Authentication',
      recordId: user._id.toString(),
      ipAddress,
      result: 'FAILURE',
      details: `Login attempt on locked account. Locked for ${remainingMinutes} more minutes.`,
    });
    throw new AppError(
      `Account is locked due to repeated failed attempts. Please try again in ${remainingMinutes} minute(s) or contact an administrator.`,
      423
    );
  }

  // Compare Password
  const isMatch = await comparePassword(password, user.passwordHash);

  if (!isMatch) {
    user.failedLoginCount = (user.failedLoginCount || 0) + 1;

    let lockoutMessage = 'Invalid email or password.';
    if (user.failedLoginCount >= ENV.LOCKOUT_ATTEMPTS_LIMIT) {
      user.lockoutUntil = new Date(Date.now() + ENV.LOCKOUT_DURATION_MINUTES * 60000);
      await user.save();

      await logAudit({
        userId: user._id,
        userEmail: user.email,
        role: user.role,
        action: AUDIT_ACTIONS.LOCKOUT,
        entityName: 'User',
        recordId: user._id.toString(),
        ipAddress,
        result: 'FAILURE',
        details: `Account locked after ${user.failedLoginCount} failed login attempts.`,
      });

      throw new AppError(
        `Account has been locked for ${ENV.LOCKOUT_DURATION_MINUTES} minutes due to multiple failed login attempts.`,
        423
      );
    } else {
      await user.save();
      const attemptsLeft = ENV.LOCKOUT_ATTEMPTS_LIMIT - user.failedLoginCount;
      await logAudit({
        userId: user._id,
        userEmail: user.email,
        role: user.role,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityName: 'Authentication',
        recordId: user._id.toString(),
        ipAddress,
        result: 'FAILURE',
        details: `Failed password attempt (${user.failedLoginCount}/${ENV.LOCKOUT_ATTEMPTS_LIMIT}).`,
      });

      throw new AppError(`Invalid email or password. ${attemptsLeft} attempt(s) remaining before account lockout.`, 401);
    }
  }

  // Successful Login
  user.failedLoginCount = 0;
  user.lockoutUntil = null;
  user.lastLoginAt = new Date();

  const payload = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = refreshToken;
  await user.save();

  await logAudit({
    userId: user._id,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.LOGIN,
    entityName: 'Authentication',
    recordId: user._id.toString(),
    ipAddress,
    result: 'SUCCESS',
    details: 'User authenticated successfully',
  });

  return { user, accessToken, refreshToken };
};

export const logoutUser = async (userId, ipAddress = '') => {
  const user = await User.findById(userId);
  if (user) {
    user.refreshToken = null;
    await user.save();

    await logAudit({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: AUDIT_ACTIONS.LOGOUT,
      entityName: 'Authentication',
      recordId: user._id.toString(),
      ipAddress,
      details: 'User logged out safely',
    });
  }
};

export const refreshAccessToken = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    throw new AppError('Refresh token required.', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== oldRefreshToken || !user.isActive) {
    throw new AppError('Invalid refresh token or inactive account.', 401);
  }

  const payload = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  // Refresh token rotation
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
};

export const forgotPassword = async (email, ipAddress = '') => {
  const user = await User.findOne({ email });
  if (!user) {
    // Return success to avoid email enumeration
    return { message: 'If that email is registered, password reset instructions have been generated.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hash;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  await logAudit({
    userId: user._id,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    entityName: 'Authentication',
    recordId: user._id.toString(),
    ipAddress,
    details: 'Password reset token requested',
  });

  // For testing & development ease, we return the resetToken
  return {
    message: 'Password reset token generated successfully.',
    resetToken,
  };
};

export const resetPassword = async (token, newPassword, ipAddress = '') => {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hash,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+passwordHash +resetPasswordToken +resetPasswordExpires');

  if (!user) {
    throw new AppError('Password reset token is invalid or has expired.', 400);
  }

  user.passwordHash = await hashPassword(newPassword);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.failedLoginCount = 0;
  user.lockoutUntil = null;
  await user.save();

  await logAudit({
    userId: user._id,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    entityName: 'Authentication',
    recordId: user._id.toString(),
    ipAddress,
    details: 'Password was successfully reset using token',
  });

  return { message: 'Password has been reset successfully. You can now login.' };
};

export const changePassword = async (userId, currentPassword, newPassword, ipAddress = '') => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await comparePassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Current password is incorrect.', 400, [
      { field: 'currentPassword', message: 'Current password does not match.' },
    ]);
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  await logAudit({
    userId: user._id,
    userEmail: user.email,
    role: user.role,
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    entityName: 'User',
    recordId: user._id.toString(),
    ipAddress,
    details: 'Password changed by user in settings',
  });

  return { message: 'Password changed successfully.' };
};
