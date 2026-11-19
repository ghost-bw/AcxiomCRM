import mongoose from 'mongoose';
import { ACTIVITY_STATUS, FOLLOWUP_TYPE } from '../constants/index.js';

const activitySchema = new mongoose.Schema(
  {
    activityType: {
      type: String,
      enum: Object.values(FOLLOWUP_TYPE),
      required: [true, 'Activity type is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [150, 'Subject cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    activityDate: {
      type: Date,
      required: [true, 'Activity date is required'],
      default: Date.now,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null,
      index: true,
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
    status: {
      type: String,
      enum: Object.values(ACTIVITY_STATUS),
      default: ACTIVITY_STATUS.COMPLETED,
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

activitySchema.index({ assignedTo: 1, activityDate: -1 });
activitySchema.index({ customer: 1, activityDate: -1 });
activitySchema.index({ lead: 1, activityDate: -1 });

export const Activity = mongoose.model('Activity', activitySchema);
