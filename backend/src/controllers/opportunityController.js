import * as opportunityService from '../services/opportunityService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listOpportunities = async (req, res, next) => {
  try {
    const { opportunities, meta } = await opportunityService.listOpportunities(req.user, req.query);
    return sendSuccess(res, 'Opportunities fetched successfully.', opportunities, meta);
  } catch (error) {
    next(error);
  }
};

export const getOpportunityById = async (req, res, next) => {
  try {
    const opportunity = await opportunityService.getOpportunityById(req.params.id, req.user);
    return sendSuccess(res, 'Opportunity details fetched successfully.', opportunity);
  } catch (error) {
    next(error);
  }
};

export const createOpportunity = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const opportunity = await opportunityService.createOpportunity(req.body, req.user, ipAddress);
    return sendSuccess(res, 'Opportunity created successfully.', opportunity, undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const updateOpportunity = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const opportunity = await opportunityService.updateOpportunity(req.params.id, req.body, req.user, ipAddress);
    return sendSuccess(res, 'Opportunity updated successfully.', opportunity);
  } catch (error) {
    next(error);
  }
};

export const deleteOpportunity = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const result = await opportunityService.deleteOpportunity(req.params.id, req.user, ipAddress);
    return sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};
