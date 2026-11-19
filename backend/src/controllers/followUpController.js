import * as followUpService from '../services/followUpService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listFollowUps = async (req, res, next) => {
  try {
    const { followUps, meta } = await followUpService.listFollowUps(req.user, req.query);
    return sendSuccess(res, 'Follow-ups fetched successfully.', followUps, meta);
  } catch (error) {
    next(error);
  }
};

export const getFollowUpById = async (req, res, next) => {
  try {
    const followUp = await followUpService.getFollowUpById(req.params.id, req.user);
    return sendSuccess(res, 'Follow-up details fetched successfully.', followUp);
  } catch (error) {
    next(error);
  }
};

export const createFollowUp = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const followUp = await followUpService.createFollowUp(req.body, req.user, ipAddress);
    return sendSuccess(res, 'Follow-up created successfully.', followUp, undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const updateFollowUp = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const followUp = await followUpService.updateFollowUp(req.params.id, req.body, req.user, ipAddress);
    return sendSuccess(res, 'Follow-up updated successfully.', followUp);
  } catch (error) {
    next(error);
  }
};

export const updateFollowUpStatus = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const followUp = await followUpService.updateFollowUpStatus(
      req.params.id,
      req.body.status,
      req.user,
      req.body.remarks,
      ipAddress
    );
    return sendSuccess(res, 'Follow-up status updated successfully.', followUp);
  } catch (error) {
    next(error);
  }
};
