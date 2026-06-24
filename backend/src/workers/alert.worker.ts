import { pool } from '../database/pool';
import { marketService, MarketTick } from '../services/market.service';
import { findUserById } from '../services/user.service';
import { sendAlertTriggeredEmail } from '../services/email.service';
import { sendPushToUser } from '../services/fcm.service';

interface DbActiveAlert {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string | null;
  property: string;
  operator: string;
  value: number;
  type: string;
}

let activeAlerts: DbActiveAlert[] = [];
let lastRefresh   = 0;
let isRefreshing  = false;
const REFRESH_INTERVAL = 60_000;

const refreshAlerts = async (): Promise<void> => {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const { rows } = await pool.query<DbActiveAlert>(
      "SELECT id, user_id, symbol, exchange, property, operator, value, type FROM alerts WHERE status = 'ACTIVE' AND expires_at > NOW()",
    );
    activeAlerts = rows;
    lastRefresh  = Date.now();
  } finally {
    isRefreshing = false;
  }
};

const markTriggered = async (alertId: string): Promise<void> => {
  await pool.query("UPDATE alerts SET status = 'TRIGGERED' WHERE id = $1", [alertId]);
  activeAlerts = activeAlerts.filter((a) => a.id !== alertId);
};

const evaluate = (tick: MarketTick, alert: DbActiveAlert): boolean => {
  let actualValue: number;
  switch (alert.property) {
    case 'LTP':     actualValue = tick.ltp; break;
    case 'CHANGE':  actualValue = tick.change; break;
    case 'CHANGE%': actualValue = tick.changePercent; break;
    case 'VOLUME':  actualValue = tick.volume; break;
    case 'HIGH':    actualValue = tick.high; break;
    case 'LOW':     actualValue = tick.low; break;
    default:        return false;
  }

  switch (alert.operator) {
    case '>':  return actualValue > alert.value;
    case '<':  return actualValue < alert.value;
    case '>=': return actualValue >= alert.value;
    case '<=': return actualValue <= alert.value;
    case '=':  return Math.abs(actualValue - alert.value) < 0.01;
    default:   return false;
  }
};

export const startAlertWorker = (): void => {
  refreshAlerts().catch(console.error);

  marketService.on('tick', async (tick: MarketTick) => {
    if (Date.now() - lastRefresh > REFRESH_INTERVAL) {
      await refreshAlerts().catch(console.error);
    }
    const matching = activeAlerts.filter(
      (a) => a.symbol === tick.symbol && (a.exchange === null || a.exchange === tick.exchange),
    );
    for (const alert of matching) {
      if (evaluate(tick, alert)) {
        await markTriggered(alert.id).catch(console.error);
        const direction = alert.operator.startsWith('>') ? 'above' : 'below';
        const pushBody = `${alert.symbol} hit ₹${tick.ltp.toFixed(2)} — ${alert.property} ${alert.operator} ${alert.value}`;
        sendPushToUser(alert.user_id, `🔔 Alert: ${alert.symbol}`, pushBody, {
          alertId: alert.id,
          symbol: alert.symbol,
          ltp: String(tick.ltp),
        }).catch(() => {});
        findUserById(alert.user_id).then((user) => {
          if (!user) return;
          sendAlertTriggeredEmail(user.email, alert.symbol, tick.ltp, alert.value, direction).catch(() => {});
        }).catch(() => {});
      }
    }
  });

  // Periodic full-refresh — separate from the tick-driven check above
  setInterval(() => refreshAlerts().catch(console.error), REFRESH_INTERVAL);

  console.log('[alert-worker] started');
};
