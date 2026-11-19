import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { Opportunity } from '../models/Opportunity.js';
import { FollowUp } from '../models/FollowUp.js';
import { AuditLog } from '../models/AuditLog.js';
import http from 'http';

// Simple lightweight test runner without external framework
let server;
let baseUrl = '';

const request = async (path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, body: data, headers: response.headers };
};

const runAllTests = async () => {
  console.log('====================================================');
  console.log('   ACXIOMCRM BACKEND AUTOMATED TEST SUITE          ');
  console.log('====================================================\n');

  await connectDB();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  baseUrl = 'http://localhost:5099';

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} - ${details}`);
      failed++;
    }
  };

  try {
    // 1. Health check test
    console.log('[1. System Health]');
    const healthRes = await request('/api/health');
    assert(healthRes.status === 200 && healthRes.body.status === 'healthy', 'Health check endpoint returns 200 healthy');

    // 2. Authentication Tests
    console.log('\n[2. Authentication & Security]');
    // Test valid admin login
    const adminLoginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@acxiomcrm.com', password: 'Admin@12345' },
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.data.accessToken, 'Admin valid login succeeds and returns JWT');
    const adminToken = adminLoginRes.body.data?.accessToken;

    // Test valid sales executive login
    const salesLoginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'sales1@acxiomcrm.com', password: 'Sales@12345' },
    });
    assert(salesLoginRes.status === 200 && salesLoginRes.body.data.accessToken, 'Sales Executive valid login succeeds');
    const salesToken = salesLoginRes.body.data?.accessToken;

    // Test invalid password rejection
    const invalidLoginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@acxiomcrm.com', password: 'WrongPassword@123' },
    });
    assert(invalidLoginRes.status === 401, 'Invalid password is rejected with 401 Unauthorized');

    // Test Account Lockout after repeated failed logins
    console.log('  Testing account lockout trigger (5 failed attempts)...');
    // Create a temporary user to test lockout without locking admin
    const testUser = await User.create({
      name: 'Lockout Test User',
      email: 'lockout_test@acxiomcrm.com',
      passwordHash: '$2a$12$DummyHashForTestingLockout12345678901234567890123',
      role: 'Sales Executive',
      isActive: true,
      failedLoginCount: 0,
    });

    let lastLockoutRes = null;
    for (let i = 0; i < 5; i++) {
      lastLockoutRes = await request('/api/v1/auth/login', {
        method: 'POST',
        body: { email: 'lockout_test@acxiomcrm.com', password: 'IncorrectPassword1!' },
      });
    }
    assert(
      lastLockoutRes.status === 423,
      'Account lockout triggered after 5 consecutive failed login attempts (Status 423 Locked)'
    );

    await User.deleteOne({ _id: testUser._id });

    // 3. Validation & Business Rules Enforcement
    console.log('\n[3. Mandatory Business Validation Rules]');

    // Rule: Opportunity Amount must be > 0
    const zeroAmountOppRes = await request('/api/v1/opportunities', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Zero Amount Deal',
        customer: (await Customer.findOne())._id.toString(),
        amount: 0,
        stage: 'Qualification',
        probability: 20,
        expectedCloseDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert(zeroAmountOppRes.status === 400, 'Opportunity Amount <= 0 is rejected with 400 Bad Request');

    // Rule: Probability must be between 0 and 100
    const invalidProbOppRes = await request('/api/v1/opportunities', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Invalid Prob Deal',
        customer: (await Customer.findOne())._id.toString(),
        amount: 5000,
        stage: 'Qualification',
        probability: 101,
        expectedCloseDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert(invalidProbOppRes.status === 400, 'Opportunity Probability > 100 is rejected with 400 Bad Request');

    // Rule: Expected Close Date cannot be in the past for active opportunity
    const pastDateOppRes = await request('/api/v1/opportunities', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Past Date Deal',
        customer: (await Customer.findOne())._id.toString(),
        amount: 5000,
        stage: 'Qualification',
        probability: 50,
        expectedCloseDate: '2020-01-01',
      },
    });
    assert(pastDateOppRes.status === 400, 'Active Opportunity with past Expected Close Date is rejected with 400');

    // Rule: Planned follow-up date cannot be earlier than today
    const pastFollowUpRes = await request('/api/v1/followups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        relatedType: 'Customer',
        relatedId: (await Customer.findOne())._id.toString(),
        followUpDate: '2020-01-01',
        followUpType: 'Call',
        subject: 'Historical invalid date test',
        status: 'Planned',
      },
    });
    assert(pastFollowUpRes.status === 400, 'Planned Follow-Up with past date is rejected with 400');

    // Rule: Customer invalid email format
    const invalidEmailCustRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Invalid Email Corp',
        email: 'not-an-email',
        phone: '+1 555-123-4567',
      },
    });
    assert(invalidEmailCustRes.status === 400, 'Customer with invalid email format is rejected with 400');

    // Rule: Duplicate customer email prevention
    const existingCust = await Customer.findOne({ isDeleted: false });
    const duplicateEmailCustRes = await request('/api/v1/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Duplicate Company',
        email: existingCust.email,
        phone: '+1 555-999-8888',
      },
    });
    assert(duplicateEmailCustRes.status === 409, 'Duplicate Customer email is rejected with 409 Conflict');

    // 4. Role-Based Access Control (RBAC) & Data Isolation
    console.log('\n[4. Role-Based Access Control (RBAC)]');

    // Unauthenticated access to protected route
    const unauthRes = await request('/api/v1/customers');
    assert(unauthRes.status === 401, 'Anonymous request to protected route is rejected with 401');

    // Sales Executive forbidden from User Management
    const salesUserMgmtRes = await request('/api/v1/users', {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    assert(salesUserMgmtRes.status === 403, 'Sales Executive cannot access User Management (403 Forbidden)');

    // Sales Executive forbidden from Audit Logs Report
    const salesAuditRes = await request('/api/v1/reports/audit', {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    assert(salesAuditRes.status === 403, 'Sales Executive cannot access Audit Logs Report (403 Forbidden)');

    // Admin can access User Management
    const adminUserMgmtRes = await request('/api/v1/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminUserMgmtRes.status === 200, 'Admin can access User Management (200 OK)');

    // 5. Lead Conversion Workflow
    console.log('\n[5. Lead-to-Customer Conversion Workflow]');
    const newLeadRes = await request('/api/v1/leads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Jonathan Miller',
        email: 'jonathan.m@horizonbio.com',
        phone: '+1 555-778-9900',
        companyName: 'Horizon Bio Labs',
        source: 'Website',
        status: 'Qualified',
        priority: 'High',
        expectedValue: 50000,
      },
    });
    assert(newLeadRes.status === 201, 'Lead created successfully for conversion test');
    const createdLeadId = newLeadRes.body.data?._id;

    const convertRes = await request(`/api/v1/leads/${createdLeadId}/convert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        createOpportunity: true,
        opportunityName: 'Horizon Bio - Enterprise Contract',
        opportunityAmount: 50000,
      },
    });
    assert(
      convertRes.status === 200 &&
        convertRes.body.data.customer &&
        convertRes.body.data.opportunity &&
        convertRes.body.data.lead.status === 'Converted',
      'Lead successfully converted to Customer and Opportunity with Converted status'
    );

    // 6. Audit Logging Verification
    console.log('\n[6. Audit Logging Verification]');
    const recentAuditLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(10);
    assert(
      recentAuditLogs.length > 0 && recentAuditLogs.some((l) => l.action === 'CONVERT'),
      'Audit log recorded the lead conversion event accurately'
    );

    // 7. Dynamic Reports & CSV Export
    console.log('\n[7. Dynamic Reports & CSV Export]');
    const csvReportRes = await fetch(`${baseUrl}/api/v1/reports/customers?format=csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const csvContent = await csvReportRes.text();
    assert(
      csvReportRes.status === 200 && csvContent.includes('"Customer Code"') && csvContent.includes('"Name"'),
      'Customer Report CSV export returns proper CSV headers and records'
    );

    // 8. Dynamic Dashboard Metrics
    console.log('\n[8. Dynamic Dashboard Metrics]');
    const dashboardRes = await request('/api/v1/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      dashboardRes.status === 200 &&
        dashboardRes.body.data.kpis.totalCustomers > 0 &&
        Array.isArray(dashboardRes.body.data.charts.leadStatusChart) &&
        Array.isArray(dashboardRes.body.data.charts.opportunityPipelineChart),
      'Dashboard returns dynamic database-calculated KPI metrics and chart datasets'
    );

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('Fatal error during test execution:', error);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(failed === 0 ? 0 : 1);
  }
};

runAllTests();
