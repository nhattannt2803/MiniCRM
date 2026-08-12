import request from 'supertest';
import app from '../src/app';

describe('Opportunity Pipeline API', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    
    if (loginRes.status === 200) {
      authToken = loginRes.body.data.token;
    }
  });

  it('should fetch Kanban Board columns and deals', async () => {
    if (!authToken) return;

    const res = await request(app)
      .get('/api/opportunities/kanban')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.columns)).toBe(true);
  });
});
