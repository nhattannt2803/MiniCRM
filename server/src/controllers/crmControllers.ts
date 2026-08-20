import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../config/database';
import { AppError } from '../middleware/errorMiddleware';
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
import { ApiKeyService } from '../services/ApiKeyService';
import { ProductMappingService } from '../services/ProductMappingService';
import { parseFbPsidInput, parseZaloUidInput } from '../utils/identityHelper';
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
    const lead = await LeadService.createLead(req.bizId!, {
      ...req.body,
      ownerId: req.body.ownerId || req.user?.userId,
      actorId: req.user?.userId,
      creationMethod: req.body.creationMethod || 'MANUAL',
    });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

export const getLeadEventLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await LeadService.getLeadEventLogs(req.bizId!, req.query);
    res.json({ success: true, data: result.items, pagination: result.pagination, stats: result.stats });
  } catch (err) {
    next(err);
  }
};

export const fetchSmaxThread = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await LeadService.fetchSmaxThread(req.body.url, req.bizId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const fetchSmaxMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { url, psid, forceRefresh, smaxBizSlug } = req.body;
    const inputStr = url || psid;
    const result = await LeadService.fetchSmaxMessages(inputStr, req.bizId, !!forceRefresh, smaxBizSlug);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getSmaxToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = await SystemSettingService.getSmaxApiToken(req.bizId, false);
    res.json({ success: true, data: { token } });
  } catch (err) {
    next(err);
  }
};

export const updateSmaxToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    const result = await SystemSettingService.setSmaxApiToken(token, req.bizId);
    res.json({ success: true, data: { token: result } });
  } catch (err) {
    next(err);
  }
};

export const getSmaxBizSlug = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const slug = await SystemSettingService.getSmaxBizSlug(req.bizId);
    res.json({ success: true, data: { slug } });
  } catch (err) {
    next(err);
  }
};

export const updateSmaxBizSlug = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.body;
    if (!slug || !slug.trim()) {
      res.status(400).json({ success: false, message: 'Slug không được để trống' });
      return;
    }
    const result = await SystemSettingService.setSmaxBizSlug(slug, req.bizId);
    res.json({ success: true, data: { slug: result } });
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
    const task = await TaskService.updateTaskStatus(req.bizId!, req.params.id, req.body.status, req.body.result);
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

// -----------------------------------------------------------------------------
// Public External Lead Ingestion & Single Endpoint CRUD Controller
// -----------------------------------------------------------------------------
export const handleExternalLead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    // 1. Extract Header API Key & Validate Authorization
    const apiKeyHeader =
      (req.headers['x-api-key'] as string) ||
      (req.headers['x-api-token'] as string) ||
      (req.headers['api-key'] as string) ||
      (req.headers['authorization'] as string);

    // 2. Determine action: 'create' (or default / 'ingest'), 'update', 'delete', 'read'
    const action = String(body.action || query.action || 'create').toLowerCase();
    const targetLeadId = body.id || body.leadId || body.lead_id || query.id || query.leadId || query.lead_id;

    // 3. Resolve Tenant Context (bizId) from body or query params
    let targetBiz: any = null;
    const inputBizSlug =
      body.bizSlug ||
      body.biz_slug ||
      body.smaxBizId ||
      body.smax_biz_id ||
      body.smaxBizSlug ||
      body.smax_biz_slug ||
      body.biz ||
      query.bizSlug ||
      query.biz_slug ||
      query.smaxBizId ||
      query.smax_biz_id ||
      query.smaxBizSlug ||
      query.smax_biz_slug;

    const inputBizId = body.bizId || body.biz_id || query.bizId || query.biz_id;
    const chatLink =
      body.chatLink ||
      body.chat_link ||
      body.smaxUrl ||
      body.smax_url ||
      body.linkChat ||
      body.link_chat ||
      body.url ||
      body.link;

    if (inputBizSlug) {
      targetBiz = await prisma.business.findFirst({ where: { slug: String(inputBizSlug), status: 'ACTIVE' } });
    } else if (inputBizId) {
      try {
        targetBiz = await prisma.business.findFirst({ where: { id: BigInt(inputBizId), status: 'ACTIVE' } });
      } catch (e) {}
    }

    // Try extracting bizSlug from chatLink if provided
    if (!targetBiz && chatLink && typeof chatLink === 'string') {
      const parsed = LeadService.parseSmaxUrl(chatLink.trim());
      if (parsed?.biz) {
        targetBiz = await prisma.business.findFirst({ where: { slug: parsed.biz, status: 'ACTIVE' } });
      }
    }

    // Validate Header API Key against targetBizId (or infer targetBiz from valid API Key)
    const validKeyRecord = await ApiKeyService.validateApiKey(
      apiKeyHeader,
      targetBiz ? targetBiz.id : null
    );

    // If targetBiz was not explicitly passed in body/query, use the Business bound to the API Key!
    if (!targetBiz) {
      targetBiz = validKeyRecord.business;
    }

    if (!targetBiz) {
      throw new AppError(
        "Không thể xác định Doanh nghiệp (Tenant). Vui lòng cung cấp 'bizSlug' hoặc 'bizId' hoặc 'smaxBizId' trong body/query.",
        400,
        'BIZ_NOT_SPECIFIED'
      );
    }

    const bizId: bigint = targetBiz.id;

    // Dispatch action: DELETE
    if (action === 'delete') {
      if (!targetLeadId) {
        throw new AppError('Vui lòng cung cấp ID Lead cần xóa (id/leadId)', 400, 'MISSING_LEAD_ID');
      }
      const deleteResult = await LeadService.deleteLead(bizId, targetLeadId);
      return res.json({ success: true, message: 'Xóa Lead thành công', data: deleteResult });
    }

    // Dispatch action: UPDATE
    if (action === 'update') {
      if (!targetLeadId) {
        throw new AppError('Vui lòng cung cấp ID Lead cần cập nhật (id/leadId)', 400, 'MISSING_LEAD_ID');
      }
      const updateData = { ...body };
      delete updateData.action;
      delete updateData.id;
      delete updateData.leadId;
      delete updateData.lead_id;

      const updatedLead = await LeadService.updateLead(bizId, targetLeadId, updateData);
      return res.json({ success: true, message: 'Cập nhật Lead thành công', data: updatedLead });
    }

    // Dispatch action: READ / GET
    if (action === 'read' || action === 'get') {
      if (targetLeadId) {
        const lead = await LeadService.getLeadById(bizId, targetLeadId);
        return res.json({ success: true, data: lead });
      }
      const leads = await LeadService.getLeads(bizId, query);
      return res.json({ success: true, data: leads });
    }

    // Default Action: CREATE / INGEST
    let smaxData: any = null;
    let effectiveChatLink = chatLink;

    // Extract Smax parameter options: (pageId, threadId, smaxBizId) or (psid, smaxBizId)
    let rawPageId = body.pageId || body.page_id || body.fbPageId || body.fb_page_id || query.pageId || query.page_id || '';
    let rawThreadId = body.threadId || body.thread_id || body.tid || query.threadId || query.thread_id || query.tid || '';
    const rawPsid = body.psid || body.fbPsid || body.fb_psid || query.psid || query.fbPsid || '';
    const hasExplicitSmaxBizId = Boolean(
      body.smaxBizId || body.smax_biz_id || body.smaxBizSlug || body.smax_biz_slug || body.biz ||
      query.smaxBizId || query.smax_biz_id || query.smaxBizSlug || query.smax_biz_slug
    );
    const smaxBizSlug = String(
      body.smaxBizId ||
      body.smax_biz_id ||
      body.smaxBizSlug ||
      body.smax_biz_slug ||
      body.biz ||
      query.smaxBizId ||
      query.smax_biz_id ||
      query.smaxBizSlug ||
      targetBiz.slug
    );

    // If PSID is passed in pageId_threadId format and threadId wasn't passed directly:
    if (!rawThreadId && rawPsid && typeof rawPsid === 'string' && rawPsid.includes('_')) {
      const psidMatch = rawPsid.match(/^(?:fb)?([0-9]+)_(?:fb|t_)?([0-9]+)$/i);
      if (psidMatch) {
        if (!rawPageId) rawPageId = psidMatch[1];
        rawThreadId = psidMatch[2];
      }
    }

    // Clean non-digit prefixes from threadId and pageId (e.g. "fb760420303821103" -> "760420303821103")
    const cleanPageId = String(rawPageId).replace(/^(?:fb|t_)+/gi, '').replace(/\D+/g, '');
    const cleanThreadId = String(rawThreadId).replace(/^(?:fb|t_)+/gi, '').replace(/\D+/g, '');

    // Trigger 1: Full Chat Link string
    if (chatLink && typeof chatLink === 'string' && chatLink.trim()) {
      try {
        smaxData = await LeadService.fetchSmaxThread(chatLink.trim(), bizId);
      } catch (err: any) {
        console.warn('External lead ingestion Smax fetch warning:', err.message);
      }
    }
    // Trigger 2 & Trigger 3: (pageId, threadId, smaxBizId) tuple OR (PSID + smaxBizId) pair
    else if (cleanPageId && cleanThreadId && (hasExplicitSmaxBizId || inputBizSlug)) {
      try {
        smaxData = await LeadService.fetchSmaxThread(
          {
            smaxBizSlug,
            pageId: cleanPageId,
            threadId: cleanThreadId,
          },
          bizId
        );
        effectiveChatLink = `https://smax.ai/bizs/${smaxBizSlug}/chats/fb${cleanPageId}?tid=fb${cleanThreadId}`;
      } catch (err: any) {
        console.warn('External lead ingestion Smax tuple fetch warning:', err.message);
      }
    }

    // Helper function for name parsing
    const parseNameHelper = (fullName: string) => {
      if (!fullName || !fullName.trim()) return { firstName: '', lastName: '' };
      const parts = fullName.trim().split(/\s+/);
      if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
      }
      const firstName = parts[parts.length - 1];
      const lastName = parts.slice(0, parts.length - 1).join(' ');
      return { firstName, lastName };
    };

    // Extract fields from body with alias support
    let inputFirstName = body.firstName || body.first_name || '';
    let inputLastName = body.lastName || body.last_name || body.ho || '';
    const inputFullName = body.name || body.full_name || body.ten_khach_hang || body.ten || '';

    if (!inputFirstName && inputFullName) {
      const parsedName = parseNameHelper(inputFullName);
      inputFirstName = parsedName.firstName;
      if (!inputLastName) {
        inputLastName = parsedName.lastName;
      }
    }

    let phone = body.phone || body.phone_number || body.sdt || body.so_dien_thoai || '';
    let email = body.email || '';
    let source = body.source || body.nguon || '';
    let fbPsid = parseFbPsidInput(body.fbPsid || body.fb_psid || body.psid || query.psid || '') || '';
    let fbPageId = body.fbPageId || body.fb_page_id || (cleanPageId ? `fb${cleanPageId}` : '') || '';
    let fbPageName = body.fbPageName || body.fb_page_name || '';
    let adIds: string[] = [];

    if (Array.isArray(body.adIds)) {
      adIds = body.adIds.map((a: any) => String(a).trim()).filter(Boolean);
    } else if (Array.isArray(body.ad_ids)) {
      adIds = body.ad_ids.map((a: any) => String(a).trim()).filter(Boolean);
    } else if (body.adId || body.ad_id) {
      const rawAd = String(body.adId || body.ad_id);
      adIds = rawAd.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    }

    // Merge Smax Data if fetched
    if (smaxData) {
      if (smaxData.name) {
        const isExplicitFirstNamePassed = Boolean(body.firstName || body.first_name);
        const isPlaceholderName = !inputFullName || /^(tên\s*khách\s*hàng|tên\s*kh|khách\s*hàng|customer|unknown)$/i.test(inputFullName.trim());

        if (!isExplicitFirstNamePassed || isPlaceholderName || !inputFirstName) {
          const parsedSmaxName = parseNameHelper(smaxData.name);
          inputFirstName = parsedSmaxName.firstName;
          inputLastName = parsedSmaxName.lastName;
        }
      }
      if (!phone && smaxData.phone) phone = smaxData.phone;
      if (!source) source = smaxData.source || 'FACEBOOK';
      if (!fbPsid && smaxData.fbPsid) fbPsid = smaxData.fbPsid;
      if (!fbPageId && smaxData.fbPageId) fbPageId = smaxData.fbPageId;
      if (!fbPageName && smaxData.fbPageName) fbPageName = smaxData.fbPageName;

      if (Array.isArray(smaxData.adIds) && smaxData.adIds.length > 0) {
        adIds = Array.from(new Set([...adIds, ...smaxData.adIds]));
      } else if (smaxData.adId && !adIds.includes(smaxData.adId)) {
        adIds.push(smaxData.adId);
      }
    }

    // Standalone PSID without Smax fetch: default source to FACEBOOK
    if (!source && fbPsid) {
      source = 'FACEBOOK';
    }

    // Resolve product code mapping if products array is passed in body/query
    let notes = body.notes || body.ghi_chu || body.note || '';
    const inputProducts = body.products || body.product_list || body.san_pham || query.products;
    let matchedProductIds: bigint[] = [];

    if (inputProducts && (Array.isArray(inputProducts) || typeof inputProducts === 'string' || typeof inputProducts === 'object')) {
      const prodArray = Array.isArray(inputProducts) ? inputProducts : [inputProducts];
      const resolution = await ProductMappingService.resolveProductCodes(bizId, prodArray);
      matchedProductIds = resolution.matchedProductIds;

      if (resolution.warningMessage) {
        const warningNote = `[Cảnh báo] ${resolution.warningMessage}`;
        notes = notes ? `${notes}\n${warningNote}` : warningNote;
      }
    }

    // Stack Priority 2: Validation constraints if no smax thread or for required fields
    if (!inputFirstName && !phone && !email && !fbPsid && !body.zaloUid && !body.zalo_uid) {
      throw new AppError(
        'Vui lòng cung cấp ít nhất Tên khách hàng (firstName/name), Số điện thoại (phone), Email hoặc Link chat.',
        400,
        'MISSING_REQUIRED_FIELDS'
      );
    }

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new AppError('Định dạng Email không hợp lệ.', 400, 'INVALID_EMAIL_FORMAT');
      }
    }

    if (phone && phone.trim()) {
      const cleanPhone = phone.trim();
      if (cleanPhone.length < 6) {
        throw new AppError('Số điện thoại quá ngắn, vui lòng kiểm tra lại.', 400, 'INVALID_PHONE_FORMAT');
      }
    }

    // Construct creation payload
    let finalFirstName = inputFirstName;
    let finalLastName = inputLastName;

    if (!finalFirstName) {
      if (phone) {
        finalFirstName = 'Khách hàng';
        finalLastName = phone.trim();
      } else if (fbPsid) {
        finalFirstName = 'Khách hàng';
        finalLastName = `FB ${fbPsid.replace(/^fb/, '')}`;
      } else {
        finalFirstName = 'Khách hàng';
      }
    }

    const leadPayload: any = {
      firstName: finalFirstName,
      lastName: finalLastName || '',
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
      companyName: body.companyName || body.company_name || body.ten_cong_ty || null,
      jobTitle: body.jobTitle || body.job_title || body.chuc_vu || null,
      source: source || 'WEBSITE',
      status: body.status || body.trang_thai || 'NEW',
      rating: body.rating || body.danh_gia || 'WARM',
      notes: notes || null,
      fbPsid: fbPsid || null,
      zaloUid: body.zaloUid || body.zalo_uid || null,
      fbPageId: fbPageId || null,
      fbPageName: fbPageName || null,
      smaxBizSlug: smaxData?.smaxBizSlug || body.smaxBizSlug || targetBiz.slug || null,
      productIds: Array.from(new Set([
        ...matchedProductIds.map((id) => id.toString()),
        ...(Array.isArray(body.productIds) ? body.productIds.map((id: any) => String(id)) : []),
        ...(Array.isArray(body.product_ids) ? body.product_ids.map((id: any) => String(id)) : []),
        ...(body.productId || body.product_id ? [String(body.productId || body.product_id)] : []),
      ])),
      adIds,
      ownerId: body.ownerId || body.owner_id || null,
      receivedAt: body.receivedAt || body.received_at ? new Date(body.receivedAt || body.received_at) : new Date(),
      creationMethod: 'API',
    };

    const result = await LeadService.createLead(bizId, leadPayload);
    res.status(201).json({
      success: true,
      message: result.message || 'Tạo/Gộp Lead thành công',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// -----------------------------------------------------------------------------
// API Key Management Controllers (Scoped per Biz)
// -----------------------------------------------------------------------------
export const getBizApiKeys = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const keys = await ApiKeyService.getApiKeys(req.bizId!);
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
};

export const createBizApiKey = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, expiresAt } = req.body;
    const created = await ApiKeyService.createApiKey(
      req.bizId!,
      name,
      req.user?.userId ? BigInt(req.user.userId) : null,
      expiresAt ? new Date(expiresAt) : null
    );
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const revokeBizApiKey = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ApiKeyService.revokeApiKey(req.bizId!, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const toggleBizApiKeyStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ApiKeyService.toggleApiKeyStatus(req.bizId!, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// --- Product Mapping Management ---
export const getBizProductMappings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mappings = await ProductMappingService.getProductMappings(req.bizId!);
    res.json({ success: true, data: mappings });
  } catch (err) {
    next(err);
  }
};

export const createBizProductMapping = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { externalCode, externalName, productId } = req.body;
    const mapping = await ProductMappingService.createProductMapping(
      req.bizId!,
      externalCode,
      externalName,
      productId
    );
    res.status(201).json({ success: true, message: 'Tạo mapping sản phẩm thành công', data: mapping });
  } catch (err) {
    next(err);
  }
};

export const updateBizProductMapping = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const mapping = await ProductMappingService.updateProductMapping(
      req.bizId!,
      req.params.id,
      req.body
    );
    res.json({ success: true, message: 'Cập nhật mapping sản phẩm thành công', data: mapping });
  } catch (err) {
    next(err);
  }
};

export const deleteBizProductMapping = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ProductMappingService.deleteProductMapping(req.bizId!, req.params.id);
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};


