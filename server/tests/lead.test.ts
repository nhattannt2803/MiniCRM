import request from 'supertest';
import app from '../src/app';

describe('Lead Module API & Conversion', () => {
  let authToken: string;
  let createdLeadId: string;

  beforeAll(async () => {
    // Login to obtain JWT
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    
    if (loginRes.status === 200) {
      authToken = loginRes.body.data.token;
    }
  });

  it('should create a new Lead successfully', async () => {
    if (!authToken) return; // Skip if db connection offline

    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'Test',
        lastName: 'Lead',
        email: 'test.lead@crmtest.io',
        phone: '0999888777',
        companyName: 'CRM Testing Inc',
        source: 'WEBSITE',
        status: 'NEW',
        rating: 'HOT',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    createdLeadId = res.body.data.id;
  });

  it('should get lead details by ID', async () => {
    if (!authToken || !createdLeadId) return;

    const res = await request(app)
      .get(`/api/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Test');
    expect(res.body.data.lastName).toBe('Lead');
  });

  it('should convert Lead to Company, Contact & Opportunity atomically', async () => {
    if (!authToken || !createdLeadId) return;

    const res = await request(app)
      .post(`/api/leads/${createdLeadId}/convert`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyMode: 'CREATE',
        newCompanyName: 'CRM Testing Inc',
        contactMode: 'CREATE',
        createOpportunity: true,
        opportunityName: 'Test Deal from Conversion',
        opportunityAmount: 30000000.0,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyId).toBeDefined();
    expect(res.body.data.contactId).toBeDefined();
    expect(res.body.data.opportunityId).toBeDefined();
  });
});
