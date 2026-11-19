import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/apiResponse.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const { user, accessToken, refreshToken } = await authService.registerUser(req.body, ipAddress);

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    return sendSuccess(
      res,
      'User registered successfully.',
      { user, accessToken, refreshToken },
      undefined,
      201
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const { user, accessToken, refreshToken } = await authService.loginUser(req.body, ipAddress);

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    return sendSuccess(res, 'Login successful.', { user, accessToken, refreshToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    if (req.user) {
      await authService.logoutUser(req.user.userId, ipAddress);
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return sendSuccess(res, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    const { accessToken, refreshToken, user } = await authService.refreshAccessToken(token);

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    return sendSuccess(res, 'Token refreshed successfully.', { accessToken, refreshToken, user });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 'User profile fetched successfully.', { user: req.user });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const result = await authService.forgotPassword(req.body.email, ipAddress);
    return sendSuccess(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const result = await authService.resetPassword(req.body.token, req.body.newPassword, ipAddress);
    return sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const result = await authService.changePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword,
      ipAddress
    );
    return sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};
