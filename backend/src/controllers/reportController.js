import * as reportService from '../services/reportService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getCustomerReport = async (req, res, next) => {
  try {
    const customers = await reportService.getCustomerReport(req.user, req.query);

    if (req.query.format === 'csv') {
      const fields = [
        { label: 'Customer Code', key: 'customerCode' },
        { label: 'Name', key: 'name' },
        { label: 'Email', key: 'email' },
        { label: 'Phone', key: 'phone' },
        { label: 'Company', key: 'companyName' },
        { label: 'Status', key: 'status' },
        { label: 'Owner', key: 'assignedTo.name' },
        { label: 'Created Date', key: 'createdAt' },
      ];
      const csv = reportService.convertToCSV(customers, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('customer-report.csv');
      return res.send(csv);
    }

    return sendSuccess(res, 'Customer report generated successfully.', customers);
  } catch (error) {
    next(error);
  }
};

export const getLeadReport = async (req, res, next) => {
  try {
    const leads = await reportService.getLeadReport(req.user, req.query);

    if (req.query.format === 'csv') {
      const fields = [
        { label: 'Lead Code', key: 'leadCode' },
        { label: 'Name', key: 'name' },
        { label: 'Email', key: 'email' },
        { label: 'Phone', key: 'phone' },
        { label: 'Company', key: 'companyName' },
        { label: 'Source', key: 'source' },
        { label: 'Status', key: 'status' },
        { label: 'Priority', key: 'priority' },
        { label: 'Expected Value', key: 'expectedValue' },
        { label: 'Owner', key: 'assignedTo.name' },
        { label: 'Created Date', key: 'createdAt' },
      ];
      const csv = reportService.convertToCSV(leads, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('lead-report.csv');
      return res.send(csv);
    }

    return sendSuccess(res, 'Lead report generated successfully.', leads);
  } catch (error) {
    next(error);
  }
};

export const getFollowUpReport = async (req, res, next) => {
  try {
    const followUps = await reportService.getFollowUpReport(req.user, req.query);

    if (req.query.format === 'csv') {
      const fields = [
        { label: 'Subject', key: 'subject' },
        { label: 'Type', key: 'followUpType' },
        { label: 'Related Type', key: 'relatedType' },
        { label: 'Date', key: 'followUpDate' },
        { label: 'Status', key: 'status' },
        { label: 'Owner', key: 'assignedTo.name' },
        { label: 'Remarks', key: 'remarks' },
      ];
      const csv = reportService.convertToCSV(followUps, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('followup-report.csv');
      return res.send(csv);
    }

    return sendSuccess(res, 'Follow-up report generated successfully.', followUps);
  } catch (error) {
    next(error);
  }
};

export const getOpportunityReport = async (req, res, next) => {
  try {
    const opportunities = await reportService.getOpportunityReport(req.user, req.query);

    if (req.query.format === 'csv') {
      const fields = [
        { label: 'Opportunity Code', key: 'opportunityCode' },
        { label: 'Name', key: 'name' },
        { label: 'Customer', key: 'customer.name' },
        { label: 'Stage', key: 'stage' },
        { label: 'Amount', key: 'amount' },
        { label: 'Probability (%)', key: 'probability' },
        { label: 'Expected Close Date', key: 'expectedCloseDate' },
        { label: 'Status', key: 'status' },
        { label: 'Owner', key: 'assignedTo.name' },
      ];
      const csv = reportService.convertToCSV(opportunities, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('opportunity-report.csv');
      return res.send(csv);
    }

    return sendSuccess(res, 'Opportunity report generated successfully.', opportunities);
  } catch (error) {
    next(error);
  }
};

export const getPipelineReport = async (req, res, next) => {
  try {
    const data = await reportService.getPipelineReport(req.user);
    return sendSuccess(res, 'Pipeline report generated successfully.', data);
  } catch (error) {
    next(error);
  }
};

export const getConversionReport = async (req, res, next) => {
  try {
    const data = await reportService.getConversionReport(req.user, req.query);
    return sendSuccess(res, 'Conversion report generated successfully.', data);
  } catch (error) {
    next(error);
  }
};

export const getUserActivityReport = async (req, res, next) => {
  try {
    const data = await reportService.getUserActivityReport(req.user);

    if (req.query.format === 'csv') {
      const fields = [
        { label: 'Name', key: 'name' },
        { label: 'Email', key: 'email' },
        { label: 'Role', key: 'role' },
        { label: 'Total Activities', key: 'totalActivities' },
        { label: 'Calls', key: 'calls' },
        { label: 'Meetings', key: 'meetings' },
        { label: 'Emails', key: 'emails' },
        { label: 'Tasks', key: 'tasks' },
      ];
      const csv = reportService.convertToCSV(data, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('user-activity-report.csv');
      return res.send(csv);
    }

    return sendSuccess(res, 'User activity report generated successfully.', data);
  } catch (error) {
    next(error);
  }
};

export const getAuditReport = async (req, res, next) => {
  try {
    const { logs, meta } = await reportService.getAuditReport(req.user, req.query);

    if (req.query.format === 'csv') {
      const fields = [
        { label: 'Timestamp', key: 'createdAt' },
        { label: 'User Email', key: 'userEmail' },
        { label: 'Role', key: 'role' },
        { label: 'Action', key: 'action' },
        { label: 'Module/Entity', key: 'entityName' },
        { label: 'Record ID', key: 'recordId' },
        { label: 'Result', key: 'result' },
        { label: 'Details', key: 'details' },
      ];
      const csv = reportService.convertToCSV(logs, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment('audit-log-report.csv');
      return res.send(csv);
    }

    return sendSuccess(res, 'Audit log report generated successfully.', logs, meta);
  } catch (error) {
    next(error);
  }
};
