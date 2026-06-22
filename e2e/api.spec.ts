import { test, expect, BACKEND } from './fixtures/auth.fixture';

// Helpers to build headers without repeating boilerplate per-test
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

test.describe('API — GTT CRUD', () => {
  test('create → list → cancel a SINGLE GTT', async ({ auth }) => {
    const hdrs = bearer(auth.token);

    // Create
    const createRes = await auth.request.post(`${BACKEND}/api/gtt`, {
      headers: hdrs,
      data: {
        triggerType:     'SINGLE',
        symbol:          'TATASTEEL',
        exchange:        'NSE',
        transactionType: 'BUY',
        quantity:        5,
        triggerPrice:    50,
      },
    });
    expect(createRes.status()).toBe(201);
    const gtt = await createRes.json();
    expect(gtt).toMatchObject({ symbol: 'TATASTEEL', trigger_type: 'SINGLE', status: 'ACTIVE' });
    expect(typeof gtt.id).toBe('string');

    // List — must contain the newly created GTT
    const listRes = await auth.request.get(`${BACKEND}/api/gtt`, { headers: hdrs });
    expect(listRes.ok()).toBeTruthy();
    const gtts: { id: string; status: string }[] = await listRes.json();
    expect(Array.isArray(gtts)).toBe(true);
    expect(gtts.some(g => g.id === gtt.id)).toBe(true);

    // Cancel
    const cancelRes = await auth.request.delete(`${BACKEND}/api/gtt/${gtt.id}`, { headers: hdrs });
    expect(cancelRes.ok()).toBeTruthy();
    const cancelBody = await cancelRes.json();
    expect(cancelBody).toHaveProperty('message');

    // Verify cancelled status
    const list2Res = await auth.request.get(`${BACKEND}/api/gtt`, { headers: hdrs });
    const gtts2: { id: string; status: string }[] = await list2Res.json();
    const found = gtts2.find(g => g.id === gtt.id);
    expect(found?.status).toBe('CANCELLED');
  });

  test('create → list → cancel an OCO GTT', async ({ auth }) => {
    const hdrs = bearer(auth.token);

    const createRes = await auth.request.post(`${BACKEND}/api/gtt`, {
      headers: hdrs,
      data: {
        triggerType:          'OCO',
        symbol:               'RELIANCE',
        exchange:             'NSE',
        transactionType:      'SELL',
        quantity:             2,
        stoplossTriggerPrice: 2200,
        targetTriggerPrice:   2800,
      },
    });
    expect(createRes.status()).toBe(201);
    const gtt = await createRes.json();
    expect(gtt).toMatchObject({ trigger_type: 'OCO', status: 'ACTIVE' });

    // Cleanup
    await auth.request.delete(`${BACKEND}/api/gtt/${gtt.id}`, { headers: hdrs });
  });

  test('reject GTT with missing required fields', async ({ auth }) => {
    const res = await auth.request.post(`${BACKEND}/api/gtt`, {
      headers: bearer(auth.token),
      data: { triggerType: 'SINGLE', quantity: -1 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('cancel non-existent GTT returns 404', async ({ auth }) => {
    const res = await auth.request.delete(
      `${BACKEND}/api/gtt/00000000-0000-0000-0000-000000000000`,
      { headers: bearer(auth.token) },
    );
    expect(res.status()).toBe(404);
  });
});

test.describe('API — Alert CRUD', () => {
  test('create → list → cancel an alert', async ({ auth }) => {
    const hdrs = bearer(auth.token);

    const createRes = await auth.request.post(`${BACKEND}/api/alerts`, {
      headers: hdrs,
      data: {
        symbol:   'RELIANCE',
        exchange: 'NSE',
        property: 'LTP',
        operator: '>',
        value:    2500,
      },
    });
    expect(createRes.status()).toBe(201);
    const alert = await createRes.json();
    expect(alert).toMatchObject({ symbol: 'RELIANCE', property: 'LTP', status: 'ACTIVE' });
    expect(typeof alert.id).toBe('string');

    // List
    const listRes = await auth.request.get(`${BACKEND}/api/alerts`, { headers: hdrs });
    expect(listRes.ok()).toBeTruthy();
    const alerts: { id: string; status: string }[] = await listRes.json();
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.some(a => a.id === alert.id)).toBe(true);

    // Cancel
    const cancelRes = await auth.request.delete(`${BACKEND}/api/alerts/${alert.id}`, { headers: hdrs });
    expect(cancelRes.ok()).toBeTruthy();

    // Verify cancelled
    const list2Res = await auth.request.get(`${BACKEND}/api/alerts`, { headers: hdrs });
    const alerts2: { id: string; status: string }[] = await list2Res.json();
    const found = alerts2.find(a => a.id === alert.id);
    expect(found?.status).toBe('CANCELLED');
  });

  test('reject alert with invalid property enum', async ({ auth }) => {
    const res = await auth.request.post(`${BACKEND}/api/alerts`, {
      headers: bearer(auth.token),
      data: { symbol: 'RELIANCE', property: 'INVALID', operator: '>', value: 100 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('cancel non-existent alert returns 404', async ({ auth }) => {
    const res = await auth.request.delete(
      `${BACKEND}/api/alerts/00000000-0000-0000-0000-000000000000`,
      { headers: bearer(auth.token) },
    );
    expect(res.status()).toBe(404);
  });
});

test.describe('API — Pending Orders', () => {
  test('GET /trade/orders/pending returns an array', async ({ auth }) => {
    const res = await auth.request.get(`${BACKEND}/api/trade/orders/pending`, {
      headers: bearer(auth.token),
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/trade/orders/pending`);
    expect(res.status()).toBe(401);
  });
});

test.describe('API — Auth', () => {
  test('GET /auth/me returns the test user', async ({ auth }) => {
    const res = await auth.request.get(`${BACKEND}/api/auth/me`, {
      headers: bearer(auth.token),
    });
    expect(res.ok()).toBeTruthy();
    const user = await res.json();
    expect(user).toHaveProperty('userId');
    expect(user).toHaveProperty('email');
    expect(user.role).toBe('user');
  });
});
