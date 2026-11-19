import * as dashboardService from '../services/dashboardService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getDashboardData = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardMetrics(req.user, req.query);
    return sendSuccess(res, 'Dashboard metrics fetched successfully.', data);
  } catch (error) {
    next(error);
  }
};
