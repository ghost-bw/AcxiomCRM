import { z } from 'zod';
import {
  ROLES,
  LEAD_STATUS,
  LEAD_PRIORITY,
  OPPORTUNITY_STAGE,
  OPPORTUNITY_STATUS,
  FOLLOWUP_STATUS,
  FOLLOWUP_TYPE,
  ACTIVITY_STATUS,
} from '../constants/index.js';

// Helper for phone validation (7 to 15 digits, allowing optional leading + and hyphens/spaces)
const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Password policy: min 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      strongPasswordRegex,
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (@$!%*?&_-#)'
    ),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      strongPasswordRegex,
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'
    ),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      strongPasswordRegex,
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'
    ),
});

// Customer Schemas
export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer Name is required.').max(120, 'Name cannot exceed 120 characters.'),
  email: z.string().trim().email('Enter a valid email address.').toLowerCase(),
  phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number.'),
  companyName: z.string().trim().max(150).optional().default(''),
  address: z.string().trim().max(250).optional().default(''),
  city: z.string().trim().max(100).optional().default(''),
  state: z.string().trim().max(100).optional().default(''),
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid assigned user ID').optional(),
  notes: z.string().trim().max(1000).optional().default(''),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// Lead Schemas
export const createLeadSchema = z.object({
  name: z.string().trim().min(2, 'Lead name is mandatory.').max(120, 'Lead name cannot exceed 120 characters.'),
  email: z.string().trim().email('Enter a valid email address.').toLowerCase(),
  phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number.'),
  companyName: z.string().trim().max(150).optional().default(''),
  source: z.enum(['Website', 'Referral', 'Cold Call', 'Advertisement', 'Partner', 'Other']).default('Website'),
  status: z.enum(Object.values(LEAD_STATUS)).default(LEAD_STATUS.NEW),
  priority: z.enum(Object.values(LEAD_PRIORITY)).default(LEAD_PRIORITY.MEDIUM),
  expectedValue: z.number().min(0, 'Expected value cannot be negative.').default(0),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid assigned user ID').optional(),
  notes: z.string().trim().max(1000).optional().default(''),
});

export const updateLeadSchema = createLeadSchema.partial();

export const convertLeadSchema = z.object({
  createOpportunity: z.boolean().default(false),
  opportunityName: z.string().trim().max(150).optional(),
  opportunityAmount: z.number().min(0.01, 'Opportunity Amount must be greater than 0.').optional(),
  opportunityCloseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  opportunityStage: z.enum(Object.values(OPPORTUNITY_STAGE)).optional(),
});

// Opportunity Schemas
export const createOpportunitySchema = z
  .object({
    name: z.string().trim().min(2, 'Opportunity Name is required.').max(150),
    customer: z.string().regex(objectIdRegex, 'Valid Customer ID is required.'),
    lead: z.string().regex(objectIdRegex, 'Invalid Lead ID').optional().nullable(),
    amount: z.number({ required_error: 'Amount is required' }).gt(0, 'Opportunity Amount must be greater than 0.'),
    stage: z.enum(Object.values(OPPORTUNITY_STAGE)).default(OPPORTUNITY_STAGE.QUALIFICATION),
    probability: z
      .number({ required_error: 'Probability is required' })
      .min(0, 'Probability must be between 0 and 100.')
      .max(100, 'Probability must be between 0 and 100.'),
    expectedCloseDate: z
      .string({ required_error: 'Expected close date is required' })
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
    assignedTo: z.string().regex(objectIdRegex, 'Invalid assigned user ID').optional(),
    notes: z.string().trim().max(1000).optional().default(''),
  })
  .refine(
    (data) => {
      // If stage is active (not Won or Lost), close date cannot be in the past
      if (data.stage !== OPPORTUNITY_STAGE.WON && data.stage !== OPPORTUNITY_STAGE.LOST) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closeDate = new Date(data.expectedCloseDate);
        return closeDate >= today;
      }
      return true;
    },
    {
      message: 'Expected Close Date cannot be in the past for an active Opportunity.',
      path: ['expectedCloseDate'],
    }
  );

export const updateOpportunitySchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    customer: z.string().regex(objectIdRegex).optional(),
    lead: z.string().regex(objectIdRegex).optional().nullable(),
    amount: z.number().gt(0, 'Opportunity Amount must be greater than 0.').optional(),
    stage: z.enum(Object.values(OPPORTUNITY_STAGE)).optional(),
    probability: z.number().min(0, 'Probability must be between 0 and 100.').max(100, 'Probability must be between 0 and 100.').optional(),
    expectedCloseDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format').optional(),
    assignedTo: z.string().regex(objectIdRegex).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.expectedCloseDate && data.stage !== OPPORTUNITY_STAGE.WON && data.stage !== OPPORTUNITY_STAGE.LOST) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closeDate = new Date(data.expectedCloseDate);
        return closeDate >= today;
      }
      return true;
    },
    {
      message: 'Expected Close Date cannot be in the past for an active Opportunity.',
      path: ['expectedCloseDate'],
    }
  );

// Follow-up Schemas
export const createFollowUpSchema = z
  .object({
    relatedType: z.enum(['Customer', 'Lead', 'Opportunity']),
    relatedId: z.string().regex(objectIdRegex, 'Invalid related entity ID.'),
    followUpDate: z
      .string({ required_error: 'Follow-up date is required' })
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
    followUpType: z.enum(Object.values(FOLLOWUP_TYPE)).default(FOLLOWUP_TYPE.CALL),
    subject: z.string().trim().min(2, 'Subject is required.').max(150),
    remarks: z.string().trim().max(1000).optional().default(''),
    status: z.enum(Object.values(FOLLOWUP_STATUS)).default(FOLLOWUP_STATUS.PLANNED),
    assignedTo: z.string().regex(objectIdRegex, 'Invalid assigned user ID').optional(),
  })
  .refine(
    (data) => {
      // For a new planned follow-up, date cannot be earlier than today
      if (data.status === FOLLOWUP_STATUS.PLANNED) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fDate = new Date(data.followUpDate);
        return fDate >= today;
      }
      return true;
    },
    {
      message: 'Follow-up date cannot be earlier than today for a new/planned follow-up.',
      path: ['followUpDate'],
    }
  );

export const updateFollowUpSchema = z.object({
  followUpDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format').optional(),
  followUpType: z.enum(Object.values(FOLLOWUP_TYPE)).optional(),
  subject: z.string().trim().min(2).max(150).optional(),
  remarks: z.string().trim().max(1000).optional(),
  status: z.enum(Object.values(FOLLOWUP_STATUS)).optional(),
  assignedTo: z.string().regex(objectIdRegex).optional(),
});

// Activity Schemas
export const createActivitySchema = z.object({
  activityType: z.enum(Object.values(FOLLOWUP_TYPE)),
  subject: z.string().trim().min(2, 'Subject is required').max(150),
  description: z.string().trim().max(1000).optional().default(''),
  activityDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format').optional(),
  customer: z.string().regex(objectIdRegex).optional().nullable(),
  lead: z.string().regex(objectIdRegex).optional().nullable(),
  opportunity: z.string().regex(objectIdRegex).optional().nullable(),
  assignedTo: z.string().regex(objectIdRegex).optional(),
  status: z.enum(Object.values(ACTIVITY_STATUS)).default(ACTIVITY_STATUS.COMPLETED),
});

export const updateActivitySchema = createActivitySchema.partial();

// User Administration Schemas
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      strongPasswordRegex,
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'
    ),
  role: z.enum(Object.values(ROLES)).default(ROLES.SALES_EXECUTIVE),
  managerId: z.string().regex(objectIdRegex).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  managerId: z.string().regex(objectIdRegex).optional().nullable(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      strongPasswordRegex,
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'
    )
    .optional(),
});
