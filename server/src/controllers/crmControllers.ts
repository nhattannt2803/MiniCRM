import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuthService } from '../services/AuthService';
import { BusinessService } from '../services/BusinessService';
import { LeadService } from '../services/LeadService';
import { LeadConversionService } from '../services/LeadConversionService';
import { CompanyService } from '../services/CompanyService';
import { ContactService } from '../services/ContactService';
import { CustomerService } from '../services/CustomerService';
import { OpportunityService } from '../services/OpportunityService';
import { PipelineService, ProductService } from '../services/PipelineService';
import { QuoteService } from '../services/QuoteService';
import { ActivityService, TaskService, CampaignService } from '../services/ActivityService';
import { DashboardService } from '../services/DashboardService';
import { AutomationService } from '../services/AutomationService';
import { NotificationService } from '../services/NotificationService';
import { UserService } from '../services/UserService';
import { IdentityResolutionService } from '../services/IdentityResolutionService';
import { ConversationService } from '../services/ConversationService';
import { SystemSettingService } from '../services/SystemSettingService';
import { runSeedEngine } from '../services/seedEngine';

// -----------------------------------------------------------------------------
// Auth Controller
// -----------------------------------------------------------------------------
export const register = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const result = await AuthService.register({ email, password, firstName, lastName, phone });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await AuthService.getMe(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Business (Tenant) Controller
// -----------------------------------------------------------------------------
export const getAllSystemBusinesses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const businesses = await BusinessService.getAllBusinesses();
    res.json({ success: true, data: businesses });
  } catch (err) {
    next(err);
  }
};

export const toggleBusinessStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await BusinessService.toggleBusinessStatus(req.params.id, req.body.status);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getMyBusinesses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const businesses = await BusinessService.getMyBusinesses(req.user!.userId);
    res.json({ success: true, data: businesses });
  } catch (err) {
    next(err);
  }
};

export const createBusiness = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const business = await BusinessService.createBusiness(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: business });
  } catch (err) {
    next(err);
  }
};

export const updateBusiness = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const business = await BusinessService.updateBusiness(req.bizId!, req.body);
    res.json({ success: true, data: business });
  } catch (err) {
    next(err);
  }
};

export const getBizMembers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const members = await BusinessService.getBizMembers(req.bizId!);
    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
};

export const inviteMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const member = await BusinessService.inviteMember(req.bizId!, req.body);
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await BusinessService.removeMember(req.bizId!, req.params.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const switchActiveBiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { bizId } = req.body;
    const result = await BusinessService.switchDefaultBiz(req.user!.userId, bizId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Lead Controller
// -----------------------------------------------------------------------------
export const getLeads = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await LeadService.getLeads(req.bizId!, req.query);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

export const getLeadById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lead = await LeadService.getLeadById(req.bizId!, req.params.id);
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

export const createLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lead = await LeadService.createLead(req.bizId!, { ...req.body, ownerId: req.body.ownerId || req.user?.userId });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

export const updateLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lead = await LeadService.updateLead(req.bizId!, req.params.id, req.body);
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

export const convertLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await LeadConversionService.convertLead(req.bizId!, { ...req.body, leadId: req.params.id });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await LeadService.deleteLead(req.bizId!, req.params.id);
    res.json({ success: true, data: { message: 'Lead soft-deleted' } });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Company Controller
// -----------------------------------------------------------------------------
export const getCompanies = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await CompanyService.getCompanies(req.bizId!, req.query);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

export const getCompanyById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const company = await CompanyService.getCompanyById(req.bizId!, req.params.id);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

export const createCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const company = await CompanyService.createCompany(req.bizId!, { ...req.body, ownerId: req.body.ownerId || req.user?.userId });
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

export const updateCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const company = await CompanyService.updateCompany(req.bizId!, req.params.id, req.body);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

export const addCompanyContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const contact = await CompanyService.addContact(req.bizId!, req.params.id, req.body);
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

export const setPrimaryCompanyContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const contact = await CompanyService.setPrimaryContact(req.bizId!, req.params.id, req.params.contactId);
    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Contact Controller
// -----------------------------------------------------------------------------
export const getContacts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ContactService.getContacts(req.bizId!, req.query);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

export const getContactById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const contact = await ContactService.getContactById(req.bizId!, req.params.id);
    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

export const createContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const contact = await ContactService.createContact(req.bizId!, { ...req.body, ownerId: req.body.ownerId || req.user?.userId });
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

export const updateContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const contact = await ContactService.updateContact(req.bizId!, req.params.id, req.body);
    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Customer Controller
// -----------------------------------------------------------------------------
export const getCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await CustomerService.getCustomers(req.bizId!, req.query);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

export const getCustomerById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await CustomerService.getCustomerById(req.bizId!, req.params.id);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await CustomerService.createCustomer(req.bizId!, {
      ...req.body,
      ownerId: req.body.ownerId || req.user?.userId,
    });
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await CustomerService.updateCustomer(req.bizId!, req.params.id, req.body);
    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await CustomerService.deleteCustomer(req.bizId!, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Opportunity Controller
// -----------------------------------------------------------------------------
export const getOpportunities = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await OpportunityService.getOpportunities(req.bizId!, req.query);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

export const getKanbanBoard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const board = await OpportunityService.getKanbanBoard(req.bizId!, req.query.pipelineId as string);
    res.json({ success: true, data: board });
  } catch (err) {
    next(err);
  }
};

export const getOpportunityById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const opp = await OpportunityService.getOpportunityById(req.bizId!, req.params.id);
    res.json({ success: true, data: opp });
  } catch (err) {
    next(err);
  }
};

export const createOpportunity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const opp = await OpportunityService.createOpportunity(req.bizId!, {
      ...req.body,
      userId: req.user?.userId,
      ownerId: req.body.ownerId || req.user?.userId,
    });
    res.status(201).json({ success: true, data: opp });
  } catch (err) {
    next(err);
  }
};

export const updateOpportunityStage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { stageId } = req.body;
    const opp = await OpportunityService.updateStage(req.bizId!, req.params.id, stageId, req.user?.userId);
    res.json({ success: true, data: opp });
  } catch (err) {
    next(err);
  }
};

export const updateOpportunity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const opp = await OpportunityService.updateOpportunity(req.bizId!, req.params.id, req.body);
    res.json({ success: true, data: opp });
  } catch (err) {
    next(err);
  }
};

export const addOpportunityProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity, unitPrice } = req.body;
    const op = await OpportunityService.addProduct(req.bizId!, req.params.id, productId, quantity, unitPrice);
    res.status(201).json({ success: true, data: op });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Pipeline & Product Controller
// -----------------------------------------------------------------------------
export const getPipelines = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pipelines = await PipelineService.getPipelines(req.bizId!);
    res.json({ success: true, data: pipelines });
  } catch (err) {
    next(err);
  }
};

export const createPipeline = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pipeline = await PipelineService.createPipeline(req.bizId!, req.body);
    res.status(201).json({ success: true, data: pipeline });
  } catch (err) {
    next(err);
  }
};

export const updatePipeline = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pipeline = await PipelineService.updatePipeline(req.bizId!, req.params.id, req.body);
    res.json({ success: true, data: pipeline });
  } catch (err) {
    next(err);
  }
};

export const deletePipeline = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await PipelineService.deletePipeline(req.bizId!, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const addPipelineStage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stage = await PipelineService.addStage(req.bizId!, req.params.id, req.body);
    res.status(201).json({ success: true, data: stage });
  } catch (err) {
    next(err);
  }
};

export const updatePipelineStage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stage = await PipelineService.updateStage(req.bizId!, req.params.stageId, req.body);
    res.json({ success: true, data: stage });
  } catch (err) {
    next(err);
  }
};

export const deletePipelineStage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await PipelineService.deleteStage(req.bizId!, req.params.stageId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getProducts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const products = await ProductService.getProducts(req.bizId!, req.query);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.createProduct(req.bizId!, req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.getProductById(req.bizId!, req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.updateProduct(req.bizId!, req.params.id, req.body);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ProductService.deleteProduct(req.bizId!, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Quote Controller
// -----------------------------------------------------------------------------
export const getQuotes = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quotes = await QuoteService.getQuotes(req.bizId!, req.query);
    res.json({ success: true, data: quotes });
  } catch (err) {
    next(err);
  }
};

export const getQuoteById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quote = await QuoteService.getQuoteById(req.bizId!, req.params.id);
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
};

export const createQuote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quote = await QuoteService.createQuote(req.bizId!, { ...req.body, userId: req.user?.userId });
    res.status(201).json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
};

export const updateQuoteStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quote = await QuoteService.updateQuoteStatus(req.bizId!, req.params.id, req.body.status);
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Activity & Task & Campaign Controllers
// -----------------------------------------------------------------------------
export const getActivities = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const activities = await ActivityService.getActivities(req.bizId!, req.query);
    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
};

export const createActivity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const activity = await ActivityService.createActivity(req.bizId!, { ...req.body, userId: req.user?.userId });
    res.status(201).json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

export const getTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tasks = await TaskService.getTasks(req.bizId!, req.query);
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const task = await TaskService.createTask(req.bizId!, { ...req.body, userId: req.user?.userId });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const task = await TaskService.updateTaskStatus(req.bizId!, req.params.id, req.body.status);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const task = await TaskService.updateTask(req.bizId!, req.params.id, req.body);
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const getCampaigns = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const campaigns = await CampaignService.getCampaigns(req.bizId!);
    res.json({ success: true, data: campaigns });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Dashboard Controller
// -----------------------------------------------------------------------------
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await DashboardService.getDashboardStats(req.bizId!);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

export const getLeaderDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await DashboardService.getLeaderDashboardStats(req.bizId!);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

export const nudgeSalesRep = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, message } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const result = await DashboardService.nudgeSalesRep(req.bizId!, userId, message);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Automation Controller
// -----------------------------------------------------------------------------
export const getAutomations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const automations = await AutomationService.getAutomations(req.bizId!);
    res.json({ success: true, data: automations });
  } catch (err) {
    next(err);
  }
};

export const getAutomationById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const automation = await AutomationService.getAutomationById(req.bizId!, req.params.id);
    res.json({ success: true, data: automation });
  } catch (err) {
    next(err);
  }
};

export const createAutomation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const automation = await AutomationService.createAutomation(req.bizId!, { ...req.body, userId: req.user?.userId });
    res.status(201).json({ success: true, data: automation });
  } catch (err) {
    next(err);
  }
};

export const toggleAutomation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const automation = await AutomationService.toggleAutomation(req.bizId!, req.params.id, req.body.isActive);
    res.json({ success: true, data: automation });
  } catch (err) {
    next(err);
  }
};

export const updateAutomation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const automation = await AutomationService.updateAutomation(req.bizId!, req.params.id, req.body);
    res.json({ success: true, data: automation });
  } catch (err) {
    next(err);
  }
};

export const deleteAutomation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await AutomationService.deleteAutomation(req.bizId!, req.params.id);
    res.json({ success: true, data: { message: 'Automation deleted' } });
  } catch (err) {
    next(err);
  }
};

export const duplicateAutomation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const automation = await AutomationService.duplicateAutomation(req.bizId!, req.params.id, req.user?.userId);
    res.status(201).json({ success: true, data: automation });
  } catch (err) {
    next(err);
  }
};

export const importAutomation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const automation = await AutomationService.importAutomation(req.bizId!, req.body, req.user?.userId);
    res.status(201).json({ success: true, data: automation });
  } catch (err) {
    next(err);
  }
};

export const getAutomationExecutions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await AutomationService.getExecutions(req.bizId!, req.query);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Notification Controller
// -----------------------------------------------------------------------------
export const getUserNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await NotificationService.getUserNotifications(req.bizId!, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAsRead(req.params.id);
    res.json({ success: true, data: { message: 'Notification marked as read' } });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAllAsRead(req.bizId!, req.user!.userId);
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Demo Switcher Controller
// -----------------------------------------------------------------------------
export const switchDemoIndustry = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { industry } = req.body;
    const result = await runSeedEngine(req.bizId!, industry || 'xedien');
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// User, Staff, Team, Role & Lead Allocation Controllers
// -----------------------------------------------------------------------------
export const getAllSystemUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await UserService.getAllSystemUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const toggleSuperAdminStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await UserService.toggleSuperAdminStatus(req.params.id, req.body.isSuperAdmin);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await UserService.getUsers(req.bizId!);
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await UserService.createUser(req.bizId!, req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const toggleUserStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await UserService.toggleUserStatus(req.params.id, req.body.isActive);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const changeUserPassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = req.body;
    const result = await UserService.changeUserPassword(req.params.id, newPassword);
    res.json({
      success: true,
      message: 'Đổi mật khẩu tài khoản thành công',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const staff = await UserService.getStaff(req.bizId!);
    res.json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
};

export const getTeams = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const teams = await UserService.getTeams(req.bizId!);
    res.json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
};

export const getRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await UserService.getRoles(req.bizId!);
    res.json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
};

export const allocateLeads = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { leadIds, ownerId } = req.body;
    const result = await UserService.allocateLeads(req.bizId!, leadIds, ownerId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Identity Resolution & Customer Identities Controllers
// -----------------------------------------------------------------------------
export const checkIdentity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await IdentityResolutionService.resolveIdentity(req.bizId!, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const resolveLeadIdentity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { action, targetCustomerId } = req.body;
    const result = await IdentityResolutionService.resolveDuplicateLead(req.bizId!, req.params.id, action, targetCustomerId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getCustomerIdentities = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const identities = await IdentityResolutionService.getCustomerIdentities(req.bizId!, req.params.id);
    res.json({ success: true, data: identities });
  } catch (err) {
    next(err);
  }
};

export const addCustomerIdentity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type, identityValue } = req.body;
    const identity = await IdentityResolutionService.addIdentityToCustomer(req.bizId!, req.params.id, type, identityValue);
    res.status(201).json({ success: true, data: identity });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// Conversations & Messages Controllers
// -----------------------------------------------------------------------------
export const getConversations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const convs = await ConversationService.getConversations(req.bizId!, req.query);
    res.json({ success: true, data: convs.data, meta: convs.meta });
  } catch (err) {
    next(err);
  }
};

export const getConversationById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const conv = await ConversationService.getConversationById(req.bizId!, req.params.id);
    res.json({ success: true, data: conv });
  } catch (err) {
    next(err);
  }
};

export const createConversation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const conv = await ConversationService.createConversation(req.bizId!, req.body);
    res.status(201).json({ success: true, data: conv });
  } catch (err) {
    next(err);
  }
};

export const addMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const msg = await ConversationService.addMessage(req.bizId!, req.params.id, req.body);
    res.status(201).json({ success: true, data: msg });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// System Settings Controllers
// -----------------------------------------------------------------------------
export const getLeadDuplicateRule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rule = await SystemSettingService.getLeadDuplicateRule(req.bizId!);
    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

export const updateLeadDuplicateRule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await SystemSettingService.updateLeadDuplicateRule(req.bizId!, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};
