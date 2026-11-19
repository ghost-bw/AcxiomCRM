import mongoose from 'mongoose';
import { FOLLOWUP_STATUS, FOLLOWUP_TYPE } from '../constants/index.js';

const followUpSchema = new mongoose.Schema(
  {
    relatedType: {
      type: String,
      enum: ['Customer', 'Lead', 'Opportunity'],
      required: [true, 'Related entity type is required'],
      index: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Related entity ID is required'],
      index: true,
      refPath: 'relatedType',
    },
    followUpDate: {
      type: Date,
      required: [true, 'Follow-up date is required'],
      index: true,
    },
    followUpType: {
      type: String,
      enum: Object.values(FOLLOWUP_TYPE),
      default: FOLLOWUP_TYPE.CALL,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Follow-up subject is required'],
      trim: true,
      maxlength: [150, 'Subject cannot exceed 150 characters'],
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(FOLLOWUP_STATUS),
      default: FOLLOWUP_STATUS.PLANNED,
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
    completedAt: {
      type: Date,
      default: null,
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FollowUp',
      default: null,
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

followUpSchema.index({ assignedTo: 1, followUpDate: 1, status: 1 });
followUpSchema.index({ relatedType: 1, relatedId: 1 });

export const FollowUp = mongoose.model('FollowUp', followUpSchema);
