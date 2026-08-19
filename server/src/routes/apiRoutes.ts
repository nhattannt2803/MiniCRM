import { Router } from 'express';
import { authenticate, authorize, requireSuperAdmin } from '../middleware/authMiddleware';
import { tenantGuard } from '../middleware/tenantMiddleware';
import { apiLimiter, authLimiter } from '../middleware/rateLimitMiddleware';
import * as crm from '../controllers/crmControllers';

const router = Router();

// Apply general rate limiter to all API endpoints
router.use(apiLimiter);

// Auth routes (Public - Rate limited strictly)
router.post('/auth/register', authLimiter, crm.register);
router.post('/auth/login', authLimiter, crm.login);

// External Lead Ingestion & Single Endpoint CRUD API (Public - No auth header required)
router.post('/leads/external', crm.handleExternalLead);
router.post('/leads/ingest', crm.handleExternalLead);
router.post('/v1/leads', crm.handleExternalLead);

// Protected routes middleware
router.use(authenticate);

// Auth Me (before tenantGuard — returns all memberships)
router.get('/auth/me', crm.getMe);

// System-wide Management (across all Bizs, before tenantGuard - Strictly Super Admin)
router.get('/system/all-users', requireSuperAdmin, crm.getAllSystemUsers);
router.patch('/users/:id/toggle-status', requireSuperAdmin, crm.toggleUserStatus);
router.patch('/users/:id/toggle-superadmin', requireSuperAdmin, crm.toggleSuperAdminStatus);

router.get('/system/all-businesses', requireSuperAdmin, crm.getAllSystemBusinesses);
router.post('/system/businesses', requireSuperAdmin, crm.createBusiness);
router.patch('/system/businesses/:id/status', requireSuperAdmin, crm.toggleBusinessStatus);

// Business management (after authenticate, before tenantGuard)
router.get('/businesses', crm.getMyBusinesses);
router.post('/businesses', crm.createBusiness);
router.patch('/businesses/switch', crm.switchActiveBiz);

// Tenant guard — all routes below require active Biz context
router.use(tenantGuard);

// Business settings (requires active Biz)
router.patch('/businesses/current', crm.updateBusiness);
router.get('/businesses/current/members', crm.getBizMembers);
router.post('/businesses/current/members', crm.inviteMember);
router.delete('/businesses/current/members/:userId', crm.removeMember);
router.get('/businesses/current/api-keys', crm.getBizApiKeys);
router.post('/businesses/current/api-keys', crm.createBizApiKey);
router.delete('/businesses/current/api-keys/:id', crm.revokeBizApiKey);
router.patch('/businesses/current/api-keys/:id/toggle', crm.toggleBizApiKeyStatus);

router.get('/businesses/current/product-mappings', crm.getBizProductMappings);
router.post('/businesses/current/product-mappings', crm.createBizProductMapping);
router.put('/businesses/current/product-mappings/:id', crm.updateBizProductMapping);
router.delete('/businesses/current/product-mappings/:id', crm.deleteBizProductMapping);

// Leads
router.get('/leads', crm.getLeads);
router.post('/leads', crm.createLead);
router.post('/leads/check-identity', crm.checkIdentity);
router.post('/leads/fetch-smax-thread', crm.fetchSmaxThread);
router.post('/leads/fetch-smax-messages', crm.fetchSmaxMessages);
router.get('/leads/:id', crm.getLeadById);
router.patch('/leads/:id', crm.updateLead);
router.delete('/leads/:id', crm.deleteLead);
router.post('/leads/:id/convert', crm.convertLead);
router.post('/leads/:id/resolve-identity', crm.resolveLeadIdentity);

// Companies
router.get('/companies', crm.getCompanies);
router.post('/companies', crm.createCompany);
router.get('/companies/:id', crm.getCompanyById);
router.patch('/companies/:id', crm.updateCompany);
router.post('/companies/:id/contacts', crm.addCompanyContact);
router.patch('/companies/:id/contacts/:contactId/set-primary', crm.setPrimaryCompanyContact);

// Contacts
router.get('/contacts', crm.getContacts);
router.post('/contacts', crm.createContact);
router.get('/contacts/:id', crm.getContactById);
router.patch('/contacts/:id', crm.updateContact);

// Customers
router.get('/customers', crm.getCustomers);
router.post('/customers', crm.createCustomer);
router.get('/customers/:id', crm.getCustomerById);
router.put('/customers/:id', crm.updateCustomer);
router.patch('/customers/:id', crm.updateCustomer);
router.delete('/customers/:id', crm.deleteCustomer);
router.get('/customers/:id/identities', crm.getCustomerIdentities);
router.post('/customers/:id/identities', crm.addCustomerIdentity);

// Conversations
router.get('/conversations', crm.getConversations);
router.post('/conversations', crm.createConversation);
router.get('/conversations/:id', crm.getConversationById);
router.post('/conversations/:id/messages', crm.addMessage);

// Opportunities & Kanban
router.get('/opportunities', crm.getOpportunities);
router.get('/opportunities/kanban', crm.getKanbanBoard);
router.post('/opportunities', crm.createOpportunity);
router.get('/opportunities/:id', crm.getOpportunityById);
router.patch('/opportunities/:id', crm.updateOpportunity);
router.patch('/opportunities/:id/stage', crm.updateOpportunityStage);
router.post('/opportunities/:id/products', crm.addOpportunityProduct);

// Pipelines & Products
router.get('/pipelines', crm.getPipelines);
router.post('/pipelines', crm.createPipeline);
router.put('/pipelines/:id', crm.updatePipeline);
router.delete('/pipelines/:id', crm.deletePipeline);
router.post('/pipelines/:id/stages', crm.addPipelineStage);
router.put('/pipelines/stages/:stageId', crm.updatePipelineStage);
router.delete('/pipelines/stages/:stageId', crm.deletePipelineStage);

router.get('/products', crm.getProducts);
router.post('/products', crm.createProduct);
router.get('/products/:id', crm.getProductById);
router.patch('/products/:id', crm.updateProduct);
router.delete('/products/:id', crm.deleteProduct);

// Quotes
router.get('/quotes', crm.getQuotes);
router.post('/quotes', crm.createQuote);
router.get('/quotes/:id', crm.getQuoteById);
router.patch('/quotes/:id/status', crm.updateQuoteStatus);

// Activities & Tasks
router.get('/activities', crm.getActivities);
router.post('/activities', crm.createActivity);
router.get('/tasks', crm.getTasks);
router.post('/tasks', crm.createTask);
router.patch('/tasks/:id', crm.updateTask);
router.patch('/tasks/:id/status', crm.updateTaskStatus);

// Campaigns
router.get('/campaigns', crm.getCampaigns);

// Dashboard
router.get('/dashboard', crm.getDashboardStats);
router.get('/dashboard/leader', crm.getLeaderDashboardStats);
router.post('/dashboard/nudge-sales', crm.nudgeSalesRep);

// Automations
router.get('/automations', crm.getAutomations);
router.post('/automations', crm.createAutomation);
router.post('/automations/import', crm.importAutomation);
router.get('/automations/executions', crm.getAutomationExecutions);
router.get('/automations/:id', crm.getAutomationById);
router.post('/automations/:id/duplicate', crm.duplicateAutomation);
router.patch('/automations/:id/toggle', crm.toggleAutomation);
router.put('/automations/:id', crm.updateAutomation);
router.delete('/automations/:id', crm.deleteAutomation);

// Notifications
router.get('/notifications', crm.getUserNotifications);
router.patch('/notifications/:id/read', crm.markNotificationRead);
router.post('/notifications/mark-all-read', crm.markAllNotificationsRead);

// User & Org Management (Biz-scoped)
router.get('/users', crm.getUsers);
router.post('/users', crm.createUser);
router.patch('/users/:id/password', authorize(['ADMIN']), crm.changeUserPassword);
router.get('/staff', crm.getStaff);
router.get('/teams', crm.getTeams);
router.get('/roles', crm.getRoles);
router.post('/leads/allocate', crm.allocateLeads);

// Demo Industry Switcher
router.post('/demo/switch-industry', crm.switchDemoIndustry);

// System Settings (Lead duplicate rules & config)
router.get('/settings/lead-duplicate-rules', crm.getLeadDuplicateRule);
router.put('/settings/lead-duplicate-rules', crm.updateLeadDuplicateRule);
router.get('/system/smax-token', requireSuperAdmin, crm.getSmaxToken);
router.post('/system/smax-token', requireSuperAdmin, crm.updateSmaxToken);

export default router;
