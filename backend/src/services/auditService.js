import { AuditLog } from '../models/AuditLog.js';

export const logAudit = async ({
  userId = null,
  userEmail = 'Anonymous',
  role = 'None',
  action,
  entityName,
  recordId = '',
  oldValue = null,
  newValue = null,
  ipAddress = '',
  result = 'SUCCESS',
  details = '',
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      userId,
      userEmail,
      role,
      action,
      entityName,
      recordId,
      oldValue,
      newValue,
      ipAddress,
      result,
      details,
      metadata,
    });
  } catch (error) {
    console.error('[AuditLog Error] Failed to write audit log:', error);
  }
};
