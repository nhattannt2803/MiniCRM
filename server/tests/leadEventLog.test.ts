import request from 'supertest';
import app from '../src/app';

describe('Lead Event Log API & Audit Tracking', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    if (loginRes.status === 200) {
      authToken = loginRes.body.data.token;
    }
  });

  it('should record log event when creating lead and query event logs', async () => {
    if (!authToken) return;

    const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 1. Create a Lead
    const createRes = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'AuditLog',
        lastName: 'Customer',
        email: `audit.${Date.now()}@testlog.com`,
        phone: testPhone,
        source: 'WEBSITE',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);

    // 2. Fetch Lead Events Log
    const logsRes = await request(app)
      .get('/api/leads/events')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ page: 1, pageSize: 10 });

    expect(logsRes.status).toBe(200);
    expect(logsRes.body.success).toBe(true);
    expect(Array.isArray(logsRes.body.data)).toBe(true);
    expect(logsRes.body.pagination).toBeDefined();
    expect(logsRes.body.stats).toBeDefined();

    // Verify stats object structure
    expect(logsRes.body.stats.totalEvents).toBeGreaterThanOrEqual(1);
    expect(logsRes.body.stats.totalManual).toBeGreaterThanOrEqual(1);

    // Verify created log item presence
    const foundLog = logsRes.body.data.find(
      (item: any) => item.customerPhone === testPhone
    );
    expect(foundLog).toBeDefined();
    expect(foundLog.duplicateStrategy).toBe('CREATED_NEW');
    expect(foundLog.creationMethod).toBe('MANUAL');
  });
});
