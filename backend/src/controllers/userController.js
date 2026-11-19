import * as userService from '../services/userService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listUsers = async (req, res, next) => {
  try {
    const { users, meta } = await userService.listUsers(req.query);
    return sendSuccess(res, 'Users fetched successfully.', users, meta);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, 'User fetched successfully.', user);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const user = await userService.createUser(req.body, req.user, ipAddress);
    return sendSuccess(res, 'User created successfully.', user, undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const user = await userService.updateUser(req.params.id, req.body, req.user, ipAddress);
    return sendSuccess(res, 'User updated successfully.', user);
  } catch (error) {
    next(error);
  }
};

export const unlockUser = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const result = await userService.unlockUser(req.params.id, req.user, ipAddress);
    return sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const getAssignees = async (req, res, next) => {
  try {
    const assignees = await userService.getAssignees(req.user);
    return sendSuccess(res, 'Assignees fetched successfully.', assignees);
  } catch (error) {
    next(error);
  }
};
