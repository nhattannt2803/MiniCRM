import api from './api';

export const crmService = {
  // Dashboard
  getDashboardStats: () => api.get('/dashboard'),
  getLeaderDashboardStats: () => api.get('/dashboard/leader'),
  nudgeSales: (userId: string, message?: string) => api.post('/dashboard/nudge-sales', { userId, message }),

  // Identity Resolution & Check
  checkIdentity: (data: { phone?: string; email?: string; name?: string; fbPsid?: string; zaloUid?: string; webVisitorId?: string }) =>
    api.post('/leads/check-identity', data),
  resolveLeadIdentity: (leadId: string, action: 'ATTACH_TO_EXISTING' | 'CREATE_SEPARATE_CUSTOMER', targetCustomerId?: string) =>
    api.post(`/leads/${leadId}/resolve-identity`, { action, targetCustomerId }),

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
  addCompanyContact: (companyId: string, data: any) => api.post(`/companies/${companyId}/contacts`, data),
  setPrimaryCompanyContact: (companyId: string, contactId: string) =>
    api.patch(`/companies/${companyId}/contacts/${contactId}/set-primary`),

  // Contacts
  getContacts: (params?: any) => api.get('/contacts', { params }),
  getContactById: (id: string) => api.get(`/contacts/${id}`),
  createContact: (data: any) => api.post('/contacts', data),
  updateContact: (id: string, data: any) => api.patch(`/contacts/${id}`, data),

  // Customers & Customer Identities
  getCustomers: (params?: any) => api.get('/customers', { params }),
  getCustomerById: (id: string) => api.get(`/customers/${id}`),
  createCustomer: (data: any) => api.post('/customers', data),
  updateCustomer: (id: string, data: any) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id: string) => api.delete(`/customers/${id}`),
  getCustomerIdentities: (customerId: string) => api.get(`/customers/${customerId}/identities`),
  addCustomerIdentity: (customerId: string, type: string, identityValue: string) =>
    api.post(`/customers/${customerId}/identities`, { type, identityValue }),

  // Conversations & Multichannel Threading
  getConversations: (params?: any) => api.get('/conversations', { params }),
  getConversationById: (id: string) => api.get(`/conversations/${id}`),
  createConversation: (data: any) => api.post('/conversations', data),
  addMessage: (conversationId: string, data: { content: string; senderType?: string; senderId?: string }) =>
    api.post(`/conversations/${conversationId}/messages`, data),

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
  createPipeline: (data: any) => api.post('/pipelines', data),
  updatePipeline: (id: string, data: any) => api.put(`/pipelines/${id}`, data),
  deletePipeline: (id: string) => api.delete(`/pipelines/${id}`),
  addPipelineStage: (id: string, data: any) => api.post(`/pipelines/${id}/stages`, data),
  updatePipelineStage: (stageId: string, data: any) => api.put(`/pipelines/stages/${stageId}`, data),
  deletePipelineStage: (stageId: string) => api.delete(`/pipelines/stages/${stageId}`),
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
  updateTask: (id: string, data: any) => api.patch(`/tasks/${id}`, data),
  updateTaskStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),

  // Campaigns
  getCampaigns: () => api.get('/campaigns'),

  // Automations
  getAutomations: () => api.get('/automations'),
  getAutomationById: (id: string) => api.get(`/automations/${id}`),
  createAutomation: (data: any) => api.post('/automations', data),
  duplicateAutomation: (id: string) => api.post(`/automations/${id}/duplicate`),
  importAutomation: (data: any) => api.post('/automations/import', data),
  updateAutomation: (id: string, data: any) => api.put(`/automations/${id}`, data),
  deleteAutomation: (id: string) => api.delete(`/automations/${id}`),
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
  changeUserPassword: (id: string, newPassword: string) => api.patch(`/users/${id}/password`, { newPassword }),
  getStaff: () => api.get('/staff'),
  getTeams: () => api.get('/teams'),
  getRoles: () => api.get('/roles'),

  // Demo Industry Switcher
  switchDemoIndustry: (industry: string) => api.post('/demo/switch-industry', { industry }),

  // Lead Duplicate Rules & Settings
  getLeadDuplicateRule: () => api.get('/settings/lead-duplicate-rules'),
  updateLeadDuplicateRule: (data: any) => api.put('/settings/lead-duplicate-rules', data),
};
