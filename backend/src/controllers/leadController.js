import * as leadService from '../services/leadService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listLeads = async (req, res, next) => {
  try {
    const { leads, meta } = await leadService.listLeads(req.user, req.query);
    return sendSuccess(res, 'Leads fetched successfully.', leads, meta);
  } catch (error) {
    next(error);
  }
};

export const getLeadById = async (req, res, next) => {
  try {
    const lead = await leadService.getLeadById(req.params.id, req.user);
    return sendSuccess(res, 'Lead details fetched successfully.', lead);
  } catch (error) {
    next(error);
  }
};

export const createLead = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const lead = await leadService.createLead(req.body, req.user, ipAddress);
    return sendSuccess(res, 'Lead created successfully.', lead, undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const lead = await leadService.updateLead(req.params.id, req.body, req.user, ipAddress);
    return sendSuccess(res, 'Lead updated successfully.', lead);
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const result = await leadService.deleteLead(req.params.id, req.user, ipAddress);
    return sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

export const convertLead = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const result = await leadService.convertLead(req.params.id, req.body, req.user, ipAddress);
    return sendSuccess(res, 'Lead converted successfully.', result);
  } catch (error) {
    next(error);
  }
};
