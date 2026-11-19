import { Notification } from '../models/Notification.js';

export const createNotification = async ({
  recipient,
  title,
  message,
  type = 'ASSIGNMENT',
  relatedEntity = '',
  relatedId = '',
}) => {
  try {
    return await Notification.create({
      recipient,
      title,
      message,
      type,
      relatedEntity,
      relatedId,
    });
  } catch (error) {
    console.error('[Notification Error] Failed to create notification:', error);
  }
};

export const getUserNotifications = async (userId) => {
  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(30);
  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
  return { notifications, unreadCount };
};

export const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );
};

export const markAllAsRead = async (userId) => {
  return Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
};
