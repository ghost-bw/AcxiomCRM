export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES_EXECUTIVE: 'Sales Executive',
};

export const LEAD_STATUS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  UNQUALIFIED: 'Unqualified',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

export const LEAD_PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const OPPORTUNITY_STAGE = {
  QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

export const OPPORTUNITY_STATUS = {
  OPEN: 'Open',
  WON: 'Won',
  LOST: 'Lost',
};

export const FOLLOWUP_STATUS = {
  PLANNED: 'Planned',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  CANCELLED: 'Cancelled',
};

export const FOLLOWUP_TYPE = {
  CALL: 'Call',
  MEETING: 'Meeting',
  EMAIL: 'Email',
  TASK: 'Task',
};

export const ACTIVITY_STATUS = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  DEACTIVATE: 'DEACTIVATE',
  CONVERT: 'CONVERT',
  STAGE_CHANGE: 'STAGE_CHANGE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  RESCHEDULE: 'RESCHEDULE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  LOCKOUT: 'LOCKOUT',
  UNLOCK: 'UNLOCK',
};
