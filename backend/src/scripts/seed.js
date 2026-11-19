import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { Opportunity } from '../models/Opportunity.js';
import { FollowUp } from '../models/FollowUp.js';
import { Activity } from '../models/Activity.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { hashPassword } from '../utils/passwordUtils.js';
import {
  ROLES,
  LEAD_STATUS,
  LEAD_PRIORITY,
  OPPORTUNITY_STAGE,
  OPPORTUNITY_STATUS,
  FOLLOWUP_STATUS,
  FOLLOWUP_TYPE,
  ACTIVITY_STATUS,
  AUDIT_ACTIONS,
} from '../constants/index.js';

const seedData = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to database. Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Lead.deleteMany({}),
      Opportunity.deleteMany({}),
      FollowUp.deleteMany({}),
      Activity.deleteMany({}),
      AuditLog.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    console.log('[Seed] Creating demo users...');
    const adminPassword = await hashPassword('Admin@12345');
    const managerPassword = await hashPassword('Manager@12345');
    const salesPassword = await hashPassword('Sales@12345');

    const admin = await User.create({
      name: 'Eleanor Vance (Admin)',
      email: 'admin@acxiomcrm.com',
      passwordHash: adminPassword,
      role: ROLES.ADMIN,
      isActive: true,
    });

    const manager = await User.create({
      name: 'Marcus Sterling (Manager)',
      email: 'manager@acxiomcrm.com',
      passwordHash: managerPassword,
      role: ROLES.MANAGER,
      isActive: true,
    });

    const sales1 = await User.create({
      name: 'Sophia Chen (Sales)',
      email: 'sales1@acxiomcrm.com',
      passwordHash: salesPassword,
      role: ROLES.SALES_EXECUTIVE,
      managerId: manager._id,
      isActive: true,
    });

    const sales2 = await User.create({
      name: 'David Miller (Sales)',
      email: 'sales2@acxiomcrm.com',
      passwordHash: salesPassword,
      role: ROLES.SALES_EXECUTIVE,
      managerId: manager._id,
      isActive: true,
    });

    console.log('[Seed] Users created:');
    console.log(' - Admin: admin@acxiomcrm.com (Admin@12345)');
    console.log(' - Manager: manager@acxiomcrm.com (Manager@12345)');
    console.log(' - Sales 1: sales1@acxiomcrm.com (Sales@12345)');
    console.log(' - Sales 2: sales2@acxiomcrm.com (Sales@12345)');

    // 1. Customers
    console.log('[Seed] Creating enterprise customers...');
    const customersData = [
      {
        customerCode: 'CUST-1001',
        name: 'Apex Global Technologies',
        email: 'contact@apexglobal.io',
        phone: '+1 555-010-9921',
        companyName: 'Apex Global Inc',
        address: '100 Innovation Way, Suite 400',
        city: 'San Francisco',
        state: 'CA',
        status: 'Active',
        assignedTo: sales1._id,
        createdBy: admin._id,
        notes: 'Tier-1 enterprise account for cloud migration solutions.',
      },
      {
        customerCode: 'CUST-1002',
        name: 'Vanguard Health Systems',
        email: 'procurement@vanguardhealth.org',
        phone: '+1 555-019-4822',
        companyName: 'Vanguard Health Corp',
        address: '75 Medical Center Blvd',
        city: 'Boston',
        state: 'MA',
        status: 'Active',
        assignedTo: sales1._id,
        createdBy: manager._id,
        notes: 'Healthcare compliance CRM integration in progress.',
      },
      {
        customerCode: 'CUST-1003',
        name: 'Omni Retail Dynamics',
        email: 'it@omniretail.com',
        phone: '+1 555-014-7711',
        companyName: 'Omni Retailers Group',
        address: '320 Market Street',
        city: 'Chicago',
        state: 'IL',
        status: 'Active',
        assignedTo: sales2._id,
        createdBy: manager._id,
        notes: 'E-commerce omnichannel platform client.',
      },
      {
        customerCode: 'CUST-1004',
        name: 'Starlight Financial Services',
        email: 'accounts@starlightfin.com',
        phone: '+1 555-012-3344',
        companyName: 'Starlight Capital Ltd',
        address: '50 Wall Street Floor 28',
        city: 'New York',
        state: 'NY',
        status: 'Active',
        assignedTo: sales2._id,
        createdBy: admin._id,
        notes: 'Financial auditing and wealth management division.',
      },
      {
        customerCode: 'CUST-1005',
        name: 'Horizon Logistics Logistics',
        email: 'fleet@horizonlogistics.com',
        phone: '+1 555-016-8890',
        companyName: 'Horizon Freight International',
        address: '1200 Harbor Boulevard',
        city: 'Seattle',
        state: 'WA',
        status: 'Inactive',
        assignedTo: sales1._id,
        createdBy: sales1._id,
        notes: 'Paused subscription due to restructuring.',
      },
    ];

    const customers = await Customer.insertMany(customersData);

    // 2. Leads
    console.log('[Seed] Creating prospective leads...');
    const leadsData = [
      {
        leadCode: 'LEAD-1001',
        name: 'Sarah Jenkins',
        email: 'sarah.j@novasoftware.com',
        phone: '+1 555-018-2233',
        companyName: 'Nova Software Solutions',
        source: 'Website',
        status: LEAD_STATUS.QUALIFIED,
        priority: LEAD_PRIORITY.HIGH,
        expectedValue: 45000,
        assignedTo: sales1._id,
        createdBy: sales1._id,
        notes: 'Inquired about enterprise CRM license for 200 sales reps.',
      },
      {
        leadCode: 'LEAD-1002',
        name: 'Robert Thornton',
        email: 'r.thornton@beaconbiotech.com',
        phone: '+1 555-017-8899',
        companyName: 'Beacon BioTech Labs',
        source: 'Referral',
        status: LEAD_STATUS.CONTACTED,
        priority: LEAD_PRIORITY.URGENT,
        expectedValue: 78000,
        assignedTo: sales1._id,
        createdBy: manager._id,
        notes: 'Referred by Apex Global CTO. Needs proposal by next Friday.',
      },
      {
        leadCode: 'LEAD-1003',
        name: 'Elena Rostova',
        email: 'elena@quantumai.de',
        phone: '+49 30 901820',
        companyName: 'Quantum AI Systems',
        source: 'Advertisement',
        status: LEAD_STATUS.NEW,
        priority: LEAD_PRIORITY.MEDIUM,
        expectedValue: 32000,
        assignedTo: sales2._id,
        createdBy: admin._id,
        notes: 'Downloaded whitepaper on Automated Sales Workflows.',
      },
      {
        leadCode: 'LEAD-1004',
        name: 'Michael Chang',
        email: 'm.chang@pacificeast.com',
        phone: '+1 555-013-5566',
        companyName: 'Pacific East Trading',
        source: 'Cold Call',
        status: LEAD_STATUS.UNQUALIFIED,
        priority: LEAD_PRIORITY.LOW,
        expectedValue: 12000,
        assignedTo: sales2._id,
        createdBy: sales2._id,
        notes: 'Budget is too small for enterprise tier at this stage.',
      },
      {
        leadCode: 'LEAD-1005',
        name: 'James Wilson',
        email: 'contact@apexglobal.io',
        phone: '+1 555-010-9921',
        companyName: 'Apex Global Inc',
        source: 'Partner',
        status: LEAD_STATUS.CONVERTED,
        priority: LEAD_PRIORITY.HIGH,
        expectedValue: 95000,
        assignedTo: sales1._id,
        createdBy: admin._id,
        convertedTo: {
          customerId: customers[0]._id,
          convertedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        },
        notes: 'Successfully converted into active enterprise customer Apex Global.',
      },
    ];

    const leads = await Lead.insertMany(leadsData);

    // 3. Opportunities
    console.log('[Seed] Creating pipeline opportunities...');
    const now = new Date();
    const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const oppsData = [
      {
        opportunityCode: 'OPP-1001',
        name: 'Apex Global - Cloud Expansion 2026',
        customer: customers[0]._id,
        lead: leads[4]._id,
        amount: 120000,
        stage: OPPORTUNITY_STAGE.NEGOTIATION,
        probability: 75,
        expectedCloseDate: in15Days,
        status: OPPORTUNITY_STATUS.OPEN,
        assignedTo: sales1._id,
        createdBy: sales1._id,
        notes: 'Contract sent to legal team. Final pricing approved.',
      },
      {
        opportunityCode: 'OPP-1002',
        name: 'Vanguard Health - Multi-hospital Rollout',
        customer: customers[1]._id,
        amount: 85000,
        stage: OPPORTUNITY_STAGE.PROPOSAL,
        probability: 50,
        expectedCloseDate: in30Days,
        status: OPPORTUNITY_STATUS.OPEN,
        assignedTo: sales1._id,
        createdBy: manager._id,
        notes: 'Demonstrated security compliance. Proposal under review.',
      },
      {
        opportunityCode: 'OPP-1003',
        name: 'Omni Retail - Point of Sale CRM Integration',
        customer: customers[2]._id,
        amount: 64000,
        stage: OPPORTUNITY_STAGE.QUALIFICATION,
        probability: 25,
        expectedCloseDate: in45Days,
        status: OPPORTUNITY_STATUS.OPEN,
        assignedTo: sales2._id,
        createdBy: sales2._id,
        notes: 'Discovery call held with VP of Retail Operations.',
      },
      {
        opportunityCode: 'OPP-1004',
        name: 'Starlight Capital - Wealth Portal Licensing',
        customer: customers[3]._id,
        amount: 150000,
        stage: OPPORTUNITY_STAGE.WON,
        probability: 100,
        expectedCloseDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        status: OPPORTUNITY_STATUS.WON,
        assignedTo: sales2._id,
        createdBy: admin._id,
        notes: 'Signed 3-year enterprise contract. Deal successfully won.',
      },
      {
        opportunityCode: 'OPP-1005',
        name: 'Horizon Logistics - Fleet Tracking Plugin',
        customer: customers[4]._id,
        amount: 30000,
        stage: OPPORTUNITY_STAGE.LOST,
        probability: 0,
        expectedCloseDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        status: OPPORTUNITY_STATUS.LOST,
        assignedTo: sales1._id,
        createdBy: sales1._id,
        notes: 'Competitor undercut on pricing.',
      },
    ];

    const opportunities = await Opportunity.insertMany(oppsData);

    // 4. Follow-Ups
    console.log('[Seed] Scheduling follow-ups...');
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const followUpsData = [
      {
        relatedType: 'Opportunity',
        relatedId: opportunities[0]._id,
        followUpDate: tomorrow,
        followUpType: FOLLOWUP_TYPE.CALL,
        subject: 'Legal review check-in with Apex Global Counsel',
        remarks: 'Confirm if any clauses need adjustment before signing.',
        status: FOLLOWUP_STATUS.PLANNED,
        assignedTo: sales1._id,
        createdBy: sales1._id,
      },
      {
        relatedType: 'Lead',
        relatedId: leads[1]._id,
        followUpDate: in3Days,
        followUpType: FOLLOWUP_TYPE.MEETING,
        subject: 'Beacon BioTech proposal presentation',
        remarks: 'Present slide deck on FDA compliance audit tools.',
        status: FOLLOWUP_STATUS.PLANNED,
        assignedTo: sales1._id,
        createdBy: manager._id,
      },
      {
        relatedType: 'Customer',
        relatedId: customers[1]._id,
        followUpDate: yesterday,
        followUpType: FOLLOWUP_TYPE.EMAIL,
        subject: 'Follow up on security audit findings checklist',
        remarks: 'Pending response from Vanguard IT security team.',
        status: FOLLOWUP_STATUS.PLANNED, // Overdue follow-up for testing
        assignedTo: sales1._id,
        createdBy: sales1._id,
      },
      {
        relatedType: 'Opportunity',
        relatedId: opportunities[3]._id,
        followUpDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        followUpType: FOLLOWUP_TYPE.MEETING,
        subject: 'Contract signing celebration & kickoff',
        remarks: 'Completed. Onboarding dates confirmed.',
        status: FOLLOWUP_STATUS.COMPLETED,
        completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        assignedTo: sales2._id,
        createdBy: admin._id,
      },
    ];

    await FollowUp.insertMany(followUpsData);

    // 5. Activities
    console.log('[Seed] Recording activity history...');
    const activitiesData = [
      {
        activityType: FOLLOWUP_TYPE.CALL,
        subject: 'Initial discovery call with Sarah Jenkins',
        description: 'Discussed CRM requirements, team size, and timeline.',
        activityDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        lead: leads[0]._id,
        assignedTo: sales1._id,
        createdBy: sales1._id,
        status: ACTIVITY_STATUS.COMPLETED,
      },
      {
        activityType: FOLLOWUP_TYPE.MEETING,
        subject: 'Product Demo to Apex Global Architecture Council',
        description: 'Demonstrated SSO integration and multi-tenant scaling.',
        activityDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        customer: customers[0]._id,
        opportunity: opportunities[0]._id,
        assignedTo: sales1._id,
        createdBy: sales1._id,
        status: ACTIVITY_STATUS.COMPLETED,
      },
      {
        activityType: FOLLOWUP_TYPE.EMAIL,
        subject: 'Sent custom quote and ROI estimate',
        description: 'Delivered customized pricing PDF breakdown.',
        activityDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        customer: customers[2]._id,
        assignedTo: sales2._id,
        createdBy: sales2._id,
        status: ACTIVITY_STATUS.COMPLETED,
      },
      {
        activityType: FOLLOWUP_TYPE.TASK,
        subject: 'Prepare RFP response document',
        description: 'Fill in technical questionnaire for Vanguard Health.',
        activityDate: now,
        customer: customers[1]._id,
        assignedTo: sales1._id,
        createdBy: manager._id,
        status: ACTIVITY_STATUS.PENDING,
      },
    ];

    await Activity.insertMany(activitiesData);

    // 6. Audit Logs
    console.log('[Seed] Populating initial audit trail...');
    const auditLogsData = [
      {
        userId: admin._id,
        userEmail: admin.email,
        role: admin.role,
        action: AUDIT_ACTIONS.LOGIN,
        entityName: 'Authentication',
        recordId: admin._id.toString(),
        ipAddress: '127.0.0.1',
        result: 'SUCCESS',
        details: 'System administrator logged in',
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        userId: admin._id,
        userEmail: admin.email,
        role: admin.role,
        action: AUDIT_ACTIONS.CREATE,
        entityName: 'Customer',
        recordId: customers[0]._id.toString(),
        ipAddress: '127.0.0.1',
        result: 'SUCCESS',
        details: 'Created customer CUST-1001 - Apex Global Technologies',
        createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        userId: sales1._id,
        userEmail: sales1.email,
        role: sales1.role,
        action: AUDIT_ACTIONS.CONVERT,
        entityName: 'Lead',
        recordId: leads[4]._id.toString(),
        ipAddress: '127.0.0.1',
        result: 'SUCCESS',
        details: 'Lead LEAD-1005 converted to Customer CUST-1001',
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        userId: sales2._id,
        userEmail: sales2.email,
        role: sales2.role,
        action: AUDIT_ACTIONS.STAGE_CHANGE,
        entityName: 'Opportunity',
        recordId: opportunities[3]._id.toString(),
        ipAddress: '127.0.0.1',
        result: 'SUCCESS',
        details: 'Moved Opportunity OPP-1004 to stage: Won',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    ];

    await AuditLog.insertMany(auditLogsData);

    // 7. Notifications
    console.log('[Seed] Generating in-app notifications...');
    const notificationsData = [
      {
        recipient: sales1._id,
        title: 'New Lead Assigned',
        message: 'Marcus Sterling assigned lead "Robert Thornton" to you.',
        type: 'ASSIGNMENT',
        relatedEntity: 'Lead',
        relatedId: leads[1]._id.toString(),
        isRead: false,
      },
      {
        recipient: sales1._id,
        title: 'Follow-Up Overdue Reminder',
        message: 'Your follow-up with Vanguard Health Systems is overdue!',
        type: 'FOLLOW_UP_REMINDER',
        relatedEntity: 'Customer',
        relatedId: customers[1]._id.toString(),
        isRead: false,
      },
      {
        recipient: sales2._id,
        title: 'Deal Closed as Won!',
        message: 'Opportunity "Starlight Capital - Wealth Portal Licensing" marked as Won ($150,000)!',
        type: 'STATUS_CHANGE',
        relatedEntity: 'Opportunity',
        relatedId: opportunities[3]._id.toString(),
        isRead: true,
      },
    ];

    await Notification.insertMany(notificationsData);

    console.log('[Seed] Database seeding completed successfully! All records loaded.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
