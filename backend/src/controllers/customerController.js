import * as customerService from '../services/customerService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listCustomers = async (req, res, next) => {
  try {
    const { customers, meta } = await customerService.listCustomers(req.user, req.query);
    return sendSuccess(res, 'Customers fetched successfully.', customers, meta);
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const result = await customerService.getCustomerById(req.params.id, req.user);
    return sendSuccess(res, 'Customer details fetched successfully.', result);
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const customer = await customerService.createCustomer(req.body, req.user, ipAddress);
    return sendSuccess(res, 'Customer created successfully.', customer, undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const customer = await customerService.updateCustomer(req.params.id, req.body, req.user, ipAddress);
    return sendSuccess(res, 'Customer updated successfully.', customer);
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const result = await customerService.deleteCustomer(req.params.id, req.user, ipAddress);
    return sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};
