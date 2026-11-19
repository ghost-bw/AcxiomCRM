import * as activityService from '../services/activityService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listActivities = async (req, res, next) => {
  try {
    const { activities, meta } = await activityService.listActivities(req.user, req.query);
    return sendSuccess(res, 'Activities fetched successfully.', activities, meta);
  } catch (error) {
    next(error);
  }
};

export const createActivity = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const activity = await activityService.createActivity(req.body, req.user, ipAddress);
    return sendSuccess(res, 'Activity recorded successfully.', activity, undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const activity = await activityService.updateActivity(req.params.id, req.body, req.user, ipAddress);
    return sendSuccess(res, 'Activity updated successfully.', activity);
  } catch (error) {
    next(error);
  }
};
