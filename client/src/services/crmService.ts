import api from './api';

export const crmService = {
  // Dashboard
  getDashboardStats: () => api.get('/dashboard'),
  getLeaderDashboardStats: () => api.get('/dashboard/leader'),
  nudgeSales: (userId: string, message?: string) => api.post('/dashboard/nudge-sales', { userId, message }),


  // Leads
  getLeads: (params?: any) => api.get('/leads', { params }),
  getLeadById: (id: string) => api.get(`/leads/${id}`),
  createLead: (data: any) => api.post('/leads', data),
  updateLead: (id: string, data: any) => api.patch(`/leads/${id}`, data),
  deleteLead: (id: string) => api.delete(`/leads/${id}`),
  convertLead: (id: string, data: any) => api.post(`/leads/${id}/convert`, data),

  // Companies
  getCompanies: (params?: any) => api.get('/companies', { params }),
  getCompanyById: (id: string) => api.get(`/companies/${id}`),
  createCompany: (data: any) => api.post('/companies', data),
  updateCompany: (id: string, data: any) => api.patch(`/companies/${id}`, data),

  // Contacts
  getContacts: (params?: any) => api.get('/contacts', { params }),
  getContactById: (id: string) => api.get(`/contacts/${id}`),
  createContact: (data: any) => api.post('/contacts', data),
  updateContact: (id: string, data: any) => api.patch(`/contacts/${id}`, data),

  // Customers
  getCustomers: (params?: any) => api.get('/customers', { params }),
  getCustomerById: (id: string) => api.get(`/customers/${id}`),
  updateCustomer: (id: string, data: any) => api.patch(`/customers/${id}`, data),


  // Opportunities & Kanban
  getOpportunities: (params?: any) => api.get('/opportunities', { params }),
  getKanbanBoard: (pipelineId?: string) => api.get('/opportunities/kanban', { params: { pipelineId } }),
  getOpportunityById: (id: string) => api.get(`/opportunities/${id}`),
  createOpportunity: (data: any) => api.post('/opportunities', data),
  updateOpportunity: (id: string, data: any) => api.patch(`/opportunities/${id}`, data),
  updateOpportunityStage: (id: string, stageId: string) => api.patch(`/opportunities/${id}/stage`, { stageId }),
  addOpportunityProduct: (id: string, data: any) => api.post(`/opportunities/${id}/products`, data),

  // Pipelines & Products
  getPipelines: () => api.get('/pipelines'),
  getProducts: (params?: any) => api.get('/products', { params }),
  getProductById: (id: string) => api.get(`/products/${id}`),
  createProduct: (data: any) => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.patch(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),


  // Quotes
  getQuotes: (params?: any) => api.get('/quotes', { params }),
  getQuoteById: (id: string) => api.get(`/quotes/${id}`),
  createQuote: (data: any) => api.post('/quotes', data),
  updateQuoteStatus: (id: string, status: string) => api.patch(`/quotes/${id}/status`, { status }),

  // Activities & Tasks
  getActivities: (params?: any) => api.get('/activities', { params }),
  createActivity: (data: any) => api.post('/activities', data),
  getTasks: (params?: any) => api.get('/tasks', { params }),
  createTask: (data: any) => api.post('/tasks', data),
  updateTaskStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),

  // Campaigns
  getCampaigns: () => api.get('/campaigns'),

  // Automations
  getAutomations: () => api.get('/automations'),
  getAutomationById: (id: string) => api.get(`/automations/${id}`),
  createAutomation: (data: any) => api.post('/automations', data),
  toggleAutomation: (id: string, isActive: boolean) => api.patch(`/automations/${id}/toggle`, { isActive }),
  getAutomationExecutions: (params?: any) => api.get('/automations/executions', { params }),

  // Notifications
  getNotifications: () => api.get('/notifications'),
  markNotificationRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post('/notifications/mark-all-read'),

  // Lead Allocation
  allocateLeads: (leadIds: string[], ownerId: string) => api.post('/leads/allocate', { leadIds, ownerId }),

  // User & Org Management
  getUsers: () => api.get('/users'),
  createUser: (data: any) => api.post('/users', data),
  toggleUserStatus: (id: string, isActive: boolean) => api.patch(`/users/${id}/toggle-status`, { isActive }),
  getStaff: () => api.get('/staff'),
  getTeams: () => api.get('/teams'),
  getRoles: () => api.get('/roles'),

  // Demo Industry Switcher
  switchDemoIndustry: (industry: string) => api.post('/demo/switch-industry', { industry }),
};
