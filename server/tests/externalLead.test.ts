import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { ApiKeyService } from '../src/services/ApiKeyService';

describe('External Lead Single Endpoint Ingestion & CRUD API', () => {
  let createdLeadId: string;
  let testApiKey: string;
  let testBizId: string;

  beforeAll(async () => {
    // Find active business
    const biz = await prisma.business.findFirst({ where: { status: 'ACTIVE' } });
    if (biz) {
      testBizId = biz.id.toString();
      const apiKeyObj = await ApiKeyService.createApiKey(biz.id, 'Integration Test Key');
      testApiKey = apiKeyObj.key;
    }
  });

  it('should fail with 401 when x-api-key header is missing', async () => {
    const res = await request(app)
      .post('/api/leads/external')
      .send({
        name: 'No Header Test',
        phone: '0911223344',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('API_KEY_REQUIRED');
  });

  it('should fail with 401 when x-api-key header is invalid', async () => {
    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', 'mk_live_invalid_key_string')
      .send({
        name: 'Invalid Key Test',
        phone: '0911223344',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_API_KEY');
  });

  it('should create a lead with valid x-api-key header and explicit bizId', async () => {
    if (!testApiKey) return;

    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        bizId: testBizId,
        name: 'Nguyễn Văn External',
        phone: '0987654321',
        email: 'external.lead@example.com',
        source: 'WEBSITE',
        notes: 'Lead được gửi từ Webhook bên thứ ba',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    createdLeadId = res.body.data.id;
  });

  it('should create a lead using Vietnamese field aliases with x-api-key header', async () => {
    if (!testApiKey) return;

    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/leads/ingest')
      .set('x-api-key', testApiKey)
      .send({
        ten: 'Trần Thị Webhook',
        sdt: `0912${timestamp.toString().slice(-6)}`,
        email: `tranthi.webhook.${timestamp}@example.com`,
        nguon: 'ZALO',
        ghi_chu: 'Khách quan tâm xe điện 2 bánh',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('Webhook');
    expect(res.body.data.lastName).toBe('Trần Thị');
  });

  it('should process lead via pageId, threadId with fb prefix and smaxBizId tuple', async () => {
    if (!testApiKey) return;

    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        smaxBizId: 'xe-dien-move',
        pageId: 'fb760420303821103',
        threadId: 'fb27040617945611633',
        ten: 'Lê Văn SmaxTuple',
        sdt: `0933${timestamp.toString().slice(-6)}`,
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should process lead via PSID and smaxBizId pair', async () => {
    if (!testApiKey) return;

    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        psid: 'fb27153987427612742_717689788099525',
        smaxBizId: 'xe-dien-move',
        sdt: `0966${timestamp.toString().slice(-6)}`,
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should process lead via standalone PSID without smaxBizId using manual UI logic', async () => {
    if (!testApiKey) return;

    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        psid: 'fb760420303821103_28029744610001629',
        ten: 'Phạm Standalone PSID',
        sdt: `0944${timestamp.toString().slice(-6)}`,
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('FACEBOOK');
    expect(res.body.data.identityResolutionStatus).toBeDefined();
  });

  it('should process products array, mapping external codes and appending unmapped warning to notes', async () => {
    if (!testApiKey) return;

    const timestamp = Date.now();
    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        ten: 'Nguyễn Văn ProductMap',
        sdt: `0977${timestamp.toString().slice(-6)}`,
        notes: 'Khách yêu cầu tư vấn gấp',
        products: [
          { code: 'SP_UNMAPPED_999', name: 'Sản phẩm không có mapping' },
          { code: 'SP_UNMAPPED_888', name: 'Sản phẩm thử nghiệm' },
        ],
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notes).toContain('Khách yêu cầu tư vấn gấp');
    expect(res.body.data.notes).toContain('[Cảnh báo] sản phẩm mã SP_UNMAPPED_999, SP_UNMAPPED_888 không có mapping');
  });

  it('should merge new ad_id into existing lead when lead duplicate merging occurs', async () => {
    if (!testApiKey) return;

    const phone = `0988${Date.now().toString().slice(-6)}`;
    const firstRes = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        name: 'Trần Merge AdID',
        phone,
        ad_id: 'AD_INITIAL_111',
      });

    expect([200, 201]).toContain(firstRes.status);
    const firstLeadId = firstRes.body.data.id;

    // Second call with same phone and NEW ad_id
    const secondRes = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        name: 'Trần Merge AdID',
        phone,
        ad_id: 'AD_NEW_222',
      });

    expect([200, 201]).toContain(secondRes.status);
    expect(secondRes.body.data.isMerged).toBe(true);

    // Verify existing lead has both AD_INITIAL_111 and AD_NEW_222 in LeadAd table
    const leadAds = await prisma.leadAd.findMany({
      where: { leadId: BigInt(firstLeadId) },
    });
    const adIdList = leadAds.map((la) => la.adId);
    expect(adIdList).toContain('AD_INITIAL_111');
    expect(adIdList).toContain('AD_NEW_222');
  });

  it('should fail with 400 when missing required identity fields', async () => {
    if (!testApiKey) return;

    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        notes: 'Chỉ có note không có tên hay SĐT',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('should fail with 400 on invalid email format', async () => {
    if (!testApiKey) return;

    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        ten: 'Nguyễn Văn A',
        email: 'invalid-email-string',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_EMAIL_FORMAT');
  });

  it('should update an existing lead via action: update with x-api-key header', async () => {
    if (!createdLeadId || !testApiKey) return;

    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        action: 'update',
        id: createdLeadId,
        jobTitle: 'Trưởng phòng Marketing',
        rating: 'HOT',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobTitle).toBe('Trưởng phòng Marketing');
    expect(res.body.data.rating).toBe('HOT');
  });

  it('should delete a lead via action: delete with x-api-key header', async () => {
    if (!createdLeadId || !testApiKey) return;

    const res = await request(app)
      .post('/api/leads/external')
      .set('x-api-key', testApiKey)
      .send({
        action: 'delete',
        id: createdLeadId,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
