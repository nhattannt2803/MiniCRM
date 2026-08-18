export interface Business {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  taxCode?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  plan: string;
}

export interface BusinessMembership {
  bizId: string;
  bizName: string;
  bizSlug: string;
  bizLogo?: string;
  bizStatus?: string;
  roleCode: string;
  roleName: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles?: string[];
  memberships?: BusinessMembership[];
}

export interface CustomerIdentity {
  id: string;
  customerId: string;
  type: 'PHONE' | 'EMAIL' | 'FB_PSID' | 'ZALO_UID' | 'WEB_VISITOR' | string;
  identityValue: string;
  isVerified: boolean;
  status: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM' | string;
  senderId?: string;
  content: string;
  metadata?: any;
  sentAt: string;
}

export interface Conversation {
  id: string;
  customerId?: string;
  leadId?: string;
  channelType: 'FACEBOOK' | 'ZALO' | 'WEBCHAT' | 'PHONE_CALL' | 'EMAIL' | string;
  channelThreadId?: string;
  status: string;
  lastMessageAt?: string;
  createdAt: string;
  messages?: Message[];
  messageCount?: number;
  lastMessage?: Message;
  customer?: Customer;
  lead?: Lead;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'CONVERTED' | 'LOST';
  rating: 'HOT' | 'WARM' | 'COLD';
  identityResolutionStatus?: 'MATCHED' | 'POTENTIAL_DUPLICATE' | 'PENDING_REVIEW' | 'NEW_CUSTOMER';
  notes?: string;
  companyId?: string;
  contactId?: string;
  customerId?: string;
  campaignId?: string;
  ownerId?: string;
  convertedOpportunityId?: string;
  convertedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  company?: Company;
  contact?: Contact;
  customer?: Customer;
  conversations?: Conversation[];
  activities?: Activity[];
  tasks?: Task[];
}

export interface Company {
  id: string;
  name: string;
  taxCode?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  ownerId?: string;
  status: string;
  isCustomer: boolean;
  createdAt: string;
  contacts?: Contact[];
  opportunities?: Opportunity[];
  activities?: Activity[];
  tasks?: Task[];
  owner?: User;
}

export interface Contact {
  id: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  isPrimary: boolean;
  ownerId?: string;
  isCustomer: boolean;
  company?: Company;
  owner?: User;
}

export interface Customer {
  id: string;
  customerCode: string;
  entityType: 'COMPANY' | 'CONTACT';
  companyId?: string;
  contactId?: string;
  ownerId?: string;
  owner?: User;
  status: string;
  lifetimeValue: number;
  createdAt: string;
  company?: Company;
  contact?: Contact;
  identities?: CustomerIdentity[];
  leads?: Lead[];
  conversations?: Conversation[];
  opportunityCount?: number;
  leadCount?: number;
  wonOpportunities?: Opportunity[];
  activities?: Activity[];
  tasks?: Task[];
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  code: string;
  orderNo: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  allowLeadMerge?: boolean;
  stageCategory?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  stages: PipelineStage[];
}

export interface Opportunity {
  id: string;
  name: string;
  companyId?: string;
  contactId?: string;
  leadId?: string;
  ownerId?: string;
  pipelineId: string;
  stageId: string;
  amount: number;
  probability: number;
  expectedCloseDate?: string;
  source?: string;
  description?: string;
  status: 'OPEN' | 'WON' | 'LOST';
  lostReason?: string;
  stage?: PipelineStage;
  pipeline?: Pipeline;
  company?: Company;
  contact?: Contact;
  owner?: User;
  products?: OpportunityProduct[];
  quotes?: Quote[];
  stageHistories?: StageHistory[];
  activities?: Activity[];
  tasks?: Task[];
}

export interface StageHistory {
  id: string;
  opportunityId: string;
  fromStage?: PipelineStage;
  toStage: PipelineStage;
  user?: User;
  changedAt: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  type: 'PRODUCT' | 'SERVICE';
  description?: string;
  unitPrice: number;
  currency: string;
}

export interface OpportunityProduct {
  id: string;
  opportunityId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: Product;
}

export interface Quote {
  id: string;
  opportunityId: string;
  quoteNumber: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  validUntil?: string;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: Product;
}

export interface Activity {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'DEMO' | 'SMS' | 'OTHER';
  subject: string;
  description?: string;
  status: string;
  dueAt?: string;
  completedAt?: string;
  relatedType: string;
  relatedId: string;
  createdAt: string;
  owner?: User;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo?: string;
  dueAt: string;
  completedAt?: string;
  relatedType: string;
  relatedId: string;
  isOverdue?: boolean;
  assignee?: User;
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  priority: number;
  triggers: any[];
  conditions: any[];
  actions: any[];
  executionCount?: number;
}

export interface AutomationExecution {
  id: string;
  automationId: string;
  eventId: string;
  entityType: string;
  entityId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  idempotencyKey: string;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  automation?: { name: string };
  executionLogs?: any[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  readAt?: string;
  createdAt: string;
}
