import mongoose from 'mongoose';
import { LEAD_PRIORITY, LEAD_STATUS } from '../constants/index.js';

const leadSchema = new mongoose.Schema(
  {
    leadCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      maxlength: [120, 'Lead name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Lead email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Lead phone number is required'],
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['Website', 'Referral', 'Cold Call', 'Advertisement', 'Partner', 'Other'],
      default: 'Website',
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(LEAD_STATUS),
      default: LEAD_STATUS.NEW,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(LEAD_PRIORITY),
      default: LEAD_PRIORITY.MEDIUM,
      index: true,
    },
    expectedValue: {
      type: Number,
      required: true,
      min: [0, 'Expected value cannot be negative'],
      default: 0,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    convertedTo: {
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        default: null,
      },
      opportunityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Opportunity',
        default: null,
      },
      convertedAt: {
        type: Date,
        default: null,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

leadSchema.index({ name: 'text', companyName: 'text', email: 'text' });
leadSchema.index({ assignedTo: 1, status: 1, isDeleted: 1 });
leadSchema.index({ priority: 1, status: 1 });

export const Lead = mongoose.model('Lead', leadSchema);
