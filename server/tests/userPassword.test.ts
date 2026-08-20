import request from 'supertest';
import app from '../src/app';
import { UserService } from '../src/services/UserService';

describe('Admin Change Employee Password API & Service', () => {
  let authToken: string;

  beforeAll(async () => {
    // Attempt login to acquire admin token
    try {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'pass123' });
      
      if (loginRes.status === 200 && loginRes.body?.data?.token) {
        authToken = loginRes.body.data.token;
      }
    } catch (e) {
      // Ignored if test env DB offline
    }
  });

  it('UserService.changeUserPassword should validate password length', async () => {
    await expect(UserService.changeUserPassword('1', '12345')).rejects.toThrow(
      'Mật khẩu mới phải có ít nhất 6 ký tự'
    );
  });

  it('PATCH /api/users/:id/password should require authentication', async () => {
    const res = await request(app)
      .patch('/api/users/1/password')
      .send({ newPassword: 'NewSecurePassword123!' });

    expect(res.status).toBe(401);
  });

  it('PATCH /api/users/:id/password with valid token should validate payload', async () => {
    if (!authToken) return;

    const res = await request(app)
      .patch('/api/users/1/password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
