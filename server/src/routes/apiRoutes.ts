import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { apiLimiter, authLimiter } from '../middleware/rateLimitMiddleware';
import * as crm from '../controllers/crmControllers';

const router = Router();

// Apply general rate limiter to all API endpoints
router.use(apiLimiter);

// Auth routes (Public - Rate limited strictly)
router.post('/auth/login', authLimiter, crm.login);

// Protected routes middleware
router.use(authenticate);

// Auth Me
router.get('/auth/me', crm.getMe);

// Leads
router.get('/leads', crm.getLeads);
router.post('/leads', crm.createLead);
router.get('/leads/:id', crm.getLeadById);
router.patch('/leads/:id', crm.updateLead);
router.delete('/leads/:id', crm.deleteLead);
router.post('/leads/:id/convert', crm.convertLead);

// Companies
router.get('/companies', crm.getCompanies);
router.post('/companies', crm.createCompany);
router.get('/companies/:id', crm.getCompanyById);
router.patch('/companies/:id', crm.updateCompany);

// Contacts
router.get('/contacts', crm.getContacts);
router.post('/contacts', crm.createContact);
router.get('/contacts/:id', crm.getContactById);
router.patch('/contacts/:id', crm.updateContact);

// Customers
router.get('/customers', crm.getCustomers);
router.get('/customers/:id', crm.getCustomerById);

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
router.get('/products', crm.getProducts);
router.post('/products', crm.createProduct);

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
router.patch('/tasks/:id/status', crm.updateTaskStatus);

// Campaigns
router.get('/campaigns', crm.getCampaigns);

// Dashboard
router.get('/dashboard', crm.getDashboardStats);

// Automations
router.get('/automations', crm.getAutomations);
router.post('/automations', crm.createAutomation);
router.get('/automations/executions', crm.getAutomationExecutions);
router.get('/automations/:id', crm.getAutomationById);
router.patch('/automations/:id/toggle', crm.toggleAutomation);

// Notifications
router.get('/notifications', crm.getUserNotifications);
router.patch('/notifications/:id/read', crm.markNotificationRead);
router.post('/notifications/mark-all-read', crm.markAllNotificationsRead);

// Demo Industry Switcher
router.post('/demo/switch-industry', crm.switchDemoIndustry);

export default router;
