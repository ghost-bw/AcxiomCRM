import * as notificationService from '../services/notificationService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { notifications, unreadCount } = await notificationService.getUserNotifications(req.user.userId);
    return sendSuccess(res, 'Notifications fetched successfully.', { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const updated = await notificationService.markAsRead(req.params.id, req.user.userId);
    return sendSuccess(res, 'Notification marked as read.', updated);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.userId);
    return sendSuccess(res, 'All notifications marked as read.');
  } catch (error) {
    next(error);
  }
};
