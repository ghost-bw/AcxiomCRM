import mongoose from 'mongoose';
import { OPPORTUNITY_STAGE, OPPORTUNITY_STATUS } from '../constants/index.js';

const opportunitySchema = new mongoose.Schema(
  {
    opportunityCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Opportunity name is required'],
      trim: true,
      maxlength: [150, 'Opportunity name cannot exceed 150 characters'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Opportunity amount is required'],
      min: [0.01, 'Opportunity Amount must be greater than 0.'],
    },
    stage: {
      type: String,
      enum: Object.values(OPPORTUNITY_STAGE),
      default: OPPORTUNITY_STAGE.QUALIFICATION,
      index: true,
    },
    probability: {
      type: Number,
      required: [true, 'Probability is required'],
      min: [0, 'Probability must be between 0 and 100.'],
      max: [100, 'Probability must be between 0 and 100.'],
      default: 20,
    },
    expectedCloseDate: {
      type: Date,
      required: [true, 'Expected close date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(OPPORTUNITY_STATUS),
      default: OPPORTUNITY_STATUS.OPEN,
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
    notes: {
      type: String,
      trim: true,
      default: '',
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

opportunitySchema.virtual('weightedAmount').get(function () {
  return (this.amount * this.probability) / 100;
});

opportunitySchema.index({ stage: 1, status: 1 });
opportunitySchema.index({ assignedTo: 1, isDeleted: 1 });
opportunitySchema.index({ customer: 1, isDeleted: 1 });

export const Opportunity = mongoose.model('Opportunity', opportunitySchema);
