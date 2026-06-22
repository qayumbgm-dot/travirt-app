import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────
// Must appear before imports so Vitest can hoist them.

vi.mock('../database/pool', () => ({
  pool: { connect: vi.fn(), query: vi.fn() },
}));

vi.mock('../services/portfolio.service', () => ({
  getPosition:       vi.fn(),
  insertOrder:       vi.fn(),
  insertTransaction: vi.fn(),
}));

vi.mock('../services/market.service', () => ({
  marketService: {
    getPriceMap: vi.fn().mockReturnValue(new Map()),
    on:          vi.fn(),
  },
}));

vi.mock('../services/referral.service',        () => ({ awardReferrerBonus:       vi.fn().mockResolvedValue(undefined) }));
vi.mock('../services/brokerConnection.service', () => ({ routeToBroker:           vi.fn().mockResolvedValue(undefined) }));
vi.mock('../services/user.service',             () => ({ findUserById:            vi.fn().mockResolvedValue(null) }));
vi.mock('../services/email.service',            () => ({ sendTradeConfirmationEmail: vi.fn().mockResolvedValue(undefined) }));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { executeTrade, type TradeRequest } from '../services/trade.service';
import { pool }                            from '../database/pool';
import { getPosition, insertOrder, insertTransaction } from '../services/portfolio.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUY_CHARGE_RATE  = 0.0003;
const SELL_CHARGE_RATE = 0.0003;

const BASE_TRADE: TradeRequest = {
  symbol:          'TATASTEEL',
  exchange:        'NSE',
  quantity:        10,
  price:           150,
  orderType:       'MARKET',
  transactionType: 'BUY',
};

const ORDER_STUB = {
  id:               'order-uuid',
  symbol:           'TATASTEEL',
  exchange:         'NSE',
  quantity:         10,
  price:            150,
  order_type:       'MARKET',
  transaction_type: 'BUY',
  variety:          null,
  status:           'COMPLETE',
  validity:         null,
  stop_loss:        null,
  take_profit:      null,
  trigger_price:    null,
  executed_at:      new Date().toISOString(),
};

// ── Test helpers ──────────────────────────────────────────────────────────────

const makeClient = (balance: number) => ({
  query: vi.fn().mockImplementation(async (sql: string) => {
    if (/FOR UPDATE/.test(sql)) return { rows: [{ virtual_balance: balance }] };
    return { rows: [], rowCount: 1 };
  }),
  release: vi.fn(),
});

const setupBuy = (balance: number, postCommitBalance: number, existingPosition: Awaited<ReturnType<typeof getPosition>>) => {
  const client = makeClient(balance);
  vi.mocked(pool.connect).mockResolvedValue(client as any);
  vi.mocked(pool.query).mockResolvedValue({ rows: [{ virtual_balance: postCommitBalance }] } as any);
  vi.mocked(getPosition).mockResolvedValue(existingPosition);
  vi.mocked(insertTransaction).mockResolvedValue(undefined as any);
  vi.mocked(insertOrder).mockResolvedValue({ ...ORDER_STUB, transaction_type: 'BUY' } as any);
  return client;
};

const setupSell = (balance: number, postCommitBalance: number, existingPosition: Awaited<ReturnType<typeof getPosition>>) => {
  const client = makeClient(balance);
  vi.mocked(pool.connect).mockResolvedValue(client as any);
  vi.mocked(pool.query).mockResolvedValue({ rows: [{ virtual_balance: postCommitBalance }] } as any);
  vi.mocked(getPosition).mockResolvedValue(existingPosition);
  vi.mocked(insertTransaction).mockResolvedValue(undefined as any);
  vi.mocked(insertOrder).mockResolvedValue({ ...ORDER_STUB, transaction_type: 'SELL' } as any);
  return client;
};

// ── BUY tests ─────────────────────────────────────────────────────────────────

describe('executeTrade — BUY', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws statusCode 400 when virtual balance is insufficient', async () => {
    // 10 × ₹150 + 0.03% charges = ₹1500.45 → requires more than ₹100
    const client = makeClient(100);
    vi.mocked(pool.connect).mockResolvedValue(client as any);
    vi.mocked(getPosition).mockResolvedValue(null);

    await expect(executeTrade('user-1', BASE_TRADE)).rejects.toMatchObject({
      statusCode: 400,
    });
    // Transaction must be rolled back and connection released
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('deducts tradeValue + 0.03% charges on a successful BUY', async () => {
    const QTY = 5;
    const PRICE = 1000;
    const tradeValue  = QTY * PRICE;                     // 5000
    const charges     = tradeValue * BUY_CHARGE_RATE;    // 1.5
    const totalCost   = tradeValue + charges;             // 5001.5

    const client = setupBuy(100_000, 100_000 - totalCost, null);

    const result = await executeTrade('user-1', { ...BASE_TRADE, quantity: QTY, price: PRICE });

    expect(result.newBalance).toBeCloseTo(100_000 - totalCost, 5);

    const updateCall = client.query.mock.calls.find(([sql]: [string]) =>
      /UPDATE portfolio_balances/.test(sql),
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![1][0]).toBeCloseTo(totalCost, 5);
  });

  it('commits the transaction on success', async () => {
    const client = setupBuy(1_000_000, 999_000, null);
    await executeTrade('user-1', BASE_TRADE);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('inserts a new position when no prior holding exists', async () => {
    const client = setupBuy(1_000_000, 999_000, null);
    await executeTrade('user-1', BASE_TRADE);

    const insertCall = client.query.mock.calls.find(([sql]: [string]) =>
      /INSERT INTO positions/.test(sql),
    );
    expect(insertCall).toBeDefined();
    // Params: user_id, symbol, exchange, quantity, avg_price
    expect(insertCall![1][3]).toBe(BASE_TRADE.quantity);
    expect(insertCall![1][4]).toBeCloseTo(BASE_TRADE.price!, 5);
  });

  it('updates (not inserts) when adding to an existing position', async () => {
    const existingPos = { id: 'pos-1', symbol: 'TATASTEEL', exchange: 'NSE', quantity: 100, avg_price: 200 };
    const client = setupBuy(1_000_000, 999_000, existingPos);
    await executeTrade('user-1', { ...BASE_TRADE, quantity: 50, price: 300 });

    const updateCall = client.query.mock.calls.find(([sql]: [string]) =>
      /UPDATE positions/.test(sql),
    );
    expect(updateCall).toBeDefined();

    const insertCall = client.query.mock.calls.find(([sql]: [string]) =>
      /INSERT INTO positions/.test(sql),
    );
    expect(insertCall).toBeUndefined();
  });

  it('calculates weighted average price correctly when adding to a position', async () => {
    // Existing: 100 × ₹200  →  avg = 200
    // Adding:    50 × ₹300  →  new avg = (100×200 + 50×300) / 150 = 233.33…
    const existingPos = { id: 'pos-1', symbol: 'TATASTEEL', exchange: 'NSE', quantity: 100, avg_price: 200 };
    const client = setupBuy(1_000_000, 999_000, existingPos);
    await executeTrade('user-1', { ...BASE_TRADE, quantity: 50, price: 300 });

    const updateCall = client.query.mock.calls.find(([sql]: [string]) =>
      /UPDATE positions/.test(sql),
    );
    const [, params] = updateCall!;
    const newQty = params[0];   // quantity
    const newAvg = params[1];   // avg_price

    expect(newQty).toBe(150);
    expect(newAvg).toBeCloseTo(233.33, 1);
  });

  it('records a BUY transaction via insertTransaction', async () => {
    const client = setupBuy(1_000_000, 999_000, null);
    await executeTrade('user-1', BASE_TRADE);
    expect(insertTransaction).toHaveBeenCalledWith(
      'user-1',
      'TRADE_BUY',
      expect.stringContaining('TATASTEEL'),
      expect.any(String),
      client,
    );
  });
});

// ── SELL tests ────────────────────────────────────────────────────────────────

describe('executeTrade — SELL', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws statusCode 400 when no position exists', async () => {
    const client = makeClient(10_000);
    vi.mocked(pool.connect).mockResolvedValue(client as any);
    vi.mocked(getPosition).mockResolvedValue(null);

    await expect(
      executeTrade('user-1', { ...BASE_TRADE, transactionType: 'SELL' }),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('throws statusCode 400 when selling more shares than held', async () => {
    const smallPos = { id: 'pos-1', symbol: 'TATASTEEL', exchange: 'NSE', quantity: 5, avg_price: 100 };
    const client   = makeClient(10_000);
    vi.mocked(pool.connect).mockResolvedValue(client as any);
    vi.mocked(getPosition).mockResolvedValue(smallPos);

    await expect(
      // Trying to sell 10 but only own 5
      executeTrade('user-1', { ...BASE_TRADE, quantity: 10, transactionType: 'SELL' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('credits proceeds = tradeValue − 0.03% charges', async () => {
    const QTY   = 10;
    const PRICE = 200;
    const tradeValue = QTY * PRICE;                      // 2000
    const charges    = tradeValue * SELL_CHARGE_RATE;    // 0.6
    const proceeds   = tradeValue - charges;             // 1999.4

    const pos    = { id: 'pos-1', symbol: 'TATASTEEL', exchange: 'NSE', quantity: QTY, avg_price: 100 };
    const client = setupSell(10_000, 10_000 + proceeds, pos);

    const result = await executeTrade('user-1', { ...BASE_TRADE, quantity: QTY, price: PRICE, transactionType: 'SELL' });

    expect(result.newBalance).toBeCloseTo(10_000 + proceeds, 5);

    const updateBalCall = client.query.mock.calls.find(([sql]: [string]) =>
      /UPDATE portfolio_balances SET virtual_balance = virtual_balance \+/.test(sql),
    );
    expect(updateBalCall).toBeDefined();
    expect(updateBalCall![1][0]).toBeCloseTo(proceeds, 5);
  });

  it('removes the position row entirely when selling the full holding', async () => {
    const pos    = { id: 'pos-1', symbol: 'TATASTEEL', exchange: 'NSE', quantity: 10, avg_price: 100 };
    const client = setupSell(10_000, 12_000, pos);

    await executeTrade('user-1', { ...BASE_TRADE, quantity: 10, price: 200, transactionType: 'SELL' });

    const deleteCall = client.query.mock.calls.find(([sql]: [string]) =>
      /DELETE FROM positions/.test(sql),
    );
    expect(deleteCall).toBeDefined();
  });

  it('reduces quantity (not delete) when selling a partial position', async () => {
    const pos    = { id: 'pos-1', symbol: 'TATASTEEL', exchange: 'NSE', quantity: 20, avg_price: 100 };
    const client = setupSell(10_000, 11_000, pos);

    await executeTrade('user-1', { ...BASE_TRADE, quantity: 5, price: 200, transactionType: 'SELL' });

    const updatePosCall = client.query.mock.calls.find(([sql]: [string]) =>
      /UPDATE positions SET quantity/.test(sql),
    );
    expect(updatePosCall).toBeDefined();
    expect(updatePosCall![1][0]).toBe(15); // 20 − 5 = 15

    const deleteCall = client.query.mock.calls.find(([sql]: [string]) =>
      /DELETE FROM positions/.test(sql),
    );
    expect(deleteCall).toBeUndefined();
  });

  it('commits the transaction on success', async () => {
    const pos    = { id: 'pos-1', symbol: 'TATASTEEL', exchange: 'NSE', quantity: 10, avg_price: 100 };
    const client = setupSell(10_000, 12_000, pos);

    await executeTrade('user-1', { ...BASE_TRADE, quantity: 10, price: 200, transactionType: 'SELL' });

    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('records a SELL transaction via insertTransaction', async () => {
    const pos    = { id: 'pos-1', symbol: 'TATASTEEL', exchange: 'NSE', quantity: 10, avg_price: 100 };
    const client = setupSell(10_000, 12_000, pos);

    await executeTrade('user-1', { ...BASE_TRADE, quantity: 10, price: 200, transactionType: 'SELL' });

    expect(insertTransaction).toHaveBeenCalledWith(
      'user-1',
      'TRADE_SELL',
      expect.stringContaining('TATASTEEL'),
      expect.any(String),
      client,
    );
  });
});
