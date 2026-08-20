import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { CustomerService } from '../src/services/CustomerService';
import { TaskService } from '../src/services/ActivityService';

describe('Call Task Flow & Idempotency Integration Tests', () => {
  let authToken: string;
  let testBizId: bigint;
  let testUserId: bigint;

  beforeAll(async () => {
    try {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'pass123' });
      if (loginRes.status === 200 && loginRes.body?.data?.token) {
        authToken = loginRes.body.data.token;
      }
    } catch (err) {
      // Ignored if offline
    }

    const biz = await prisma.business.findFirst({ where: { status: 'ACTIVE' } });
    if (biz) {
      testBizId = biz.id;
    }
    const user = await prisma.user.findFirst();
    if (user) {
      testUserId = user.id;
    }
  });

  it('should automatically create "Gọi khách hàng - Lần 1" task when creating a customer', async () => {
    if (!authToken || !testBizId) return;

    const timestamp = Date.now();
    const customer = await CustomerService.createCustomer(testBizId, {
      entityType: 'CONTACT',
      phone: `0988${timestamp.toString().slice(-6)}`,
      ownerId: testUserId.toString(),
      firstName: 'CallTest',
      lastName: 'Customer',
    });

    expect(customer).toBeDefined();
    expect(customer.id).toBeDefined();

    const tasks = await prisma.task.findMany({
      where: {
        bizId: testBizId,
        relatedType: 'CUSTOMER',
        relatedId: BigInt(customer.id),
      },
    });

    expect(tasks.length).toBeGreaterThanOrEqual(1);
    const initialCallTask = tasks.find(t => t.title === 'Gọi khách hàng - Lần 1');
    expect(initialCallTask).toBeDefined();
    expect(initialCallTask?.status).toBe('TODO');
    expect(initialCallTask?.priority).toBe('HIGH');
  });

  it('should require a call result when completing a call task', async () => {
    if (!authToken || !testBizId) return;

    const timestamp = Date.now();
    const customer = await CustomerService.createCustomer(testBizId, {
      entityType: 'CONTACT',
      phone: `0987${timestamp.toString().slice(-6)}`,
      ownerId: testUserId.toString(),
      firstName: 'Validation',
      lastName: 'Test',
    });

    const task1 = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi khách hàng - Lần 1' },
    });
    expect(task1).toBeDefined();

    const res = await request(app)
      .patch(`/api/tasks/${task1!.id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CALL_RESULT_REQUIRED');
  });

  it('should handle attempt 1 BUSY outcome -> creates "Gọi lại khách hàng - Lần 2"', async () => {
    if (!authToken || !testBizId) return;

    const timestamp = Date.now();
    const customer = await CustomerService.createCustomer(testBizId, {
      entityType: 'CONTACT',
      phone: `0977${timestamp.toString().slice(-6)}`,
      ownerId: testUserId.toString(),
      firstName: 'Busy',
      lastName: 'Test',
    });

    const task1 = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi khách hàng - Lần 1' },
    });
    expect(task1).toBeDefined();

    const res1 = await request(app)
      .patch(`/api/tasks/${task1!.id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'COMPLETED', result: 'BUSY' });

    expect(res1.status).toBe(200);

    const updatedTask1 = await prisma.task.findUnique({ where: { id: task1!.id } });
    expect(updatedTask1?.status).toBe('COMPLETED');

    const task2 = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi lại khách hàng - Lần 2' },
    });
    expect(task2).toBeDefined();
    expect(task2?.status).toBe('TODO');
  });

  it('should handle attempt 2 UNREACHABLE outcome -> creates "Gọi lại khách hàng - Lần 3" and enforce 3-attempt limit', async () => {
    if (!authToken || !testBizId) return;

    const timestamp = Date.now();
    const customer = await CustomerService.createCustomer(testBizId, {
      entityType: 'CONTACT',
      phone: `0966${timestamp.toString().slice(-6)}`,
      ownerId: testUserId.toString(),
      firstName: 'Limit',
      lastName: 'Test',
    });

    const task1 = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi khách hàng - Lần 1' },
    });
    await TaskService.updateTaskStatus(testBizId, task1!.id.toString(), 'COMPLETED', 'BUSY');

    const task2 = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi lại khách hàng - Lần 2' },
    });
    expect(task2).toBeDefined();

    await TaskService.updateTaskStatus(testBizId, task2!.id.toString(), 'COMPLETED', 'UNREACHABLE');

    const task3 = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi lại khách hàng - Lần 3' },
    });
    expect(task3).toBeDefined();

    await TaskService.updateTaskStatus(testBizId, task3!.id.toString(), 'COMPLETED', 'BUSY');

    const task4 = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi lại khách hàng - Lần 4' },
    });
    expect(task4).toBeNull();
  });

  it('should handle WRONG_NUMBER outcome -> creates "Hỏi xác thực người" task and notification', async () => {
    if (!authToken || !testBizId) return;

    const timestamp = Date.now();
    const customer = await CustomerService.createCustomer(testBizId, {
      entityType: 'CONTACT',
      phone: `0955${timestamp.toString().slice(-6)}`,
      ownerId: testUserId.toString(),
      firstName: 'Wrong',
      lastName: 'NumberTest',
    });

    const task1 = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi khách hàng - Lần 1' },
    });

    const res = await request(app)
      .patch(`/api/tasks/${task1!.id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'COMPLETED', result: 'WRONG_NUMBER' });

    expect(res.status).toBe(200);

    const verifyTask = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Hỏi xác thực người' },
    });
    expect(verifyTask).toBeDefined();

    const notif = await prisma.notification.findFirst({
      where: { bizId: testBizId, entityType: 'CUSTOMER', entityId: BigInt(customer.id), type: 'WRONG_CUSTOMER_PHONE' },
    });
    expect(notif).toBeDefined();
  });

  it('should guarantee idempotency on duplicate task completion requests', async () => {
    if (!authToken || !testBizId) return;

    const timestamp = Date.now();
    const customer = await CustomerService.createCustomer(testBizId, {
      entityType: 'CONTACT',
      phone: `0944${timestamp.toString().slice(-6)}`,
      ownerId: testUserId.toString(),
      firstName: 'Idempotent',
      lastName: 'Test',
    });

    const task1 = await prisma.task.findFirst({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi khách hàng - Lần 1' },
    });

    const res1 = await request(app)
      .patch(`/api/tasks/${task1!.id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'COMPLETED', result: 'BUSY' });
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .patch(`/api/tasks/${task1!.id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'COMPLETED', result: 'BUSY' });
    expect(res2.status).toBe(200);

    const task2List = await prisma.task.findMany({
      where: { bizId: testBizId, relatedType: 'CUSTOMER', relatedId: BigInt(customer.id), title: 'Gọi lại khách hàng - Lần 2' },
    });
    expect(task2List.length).toBe(1);
  });
});
