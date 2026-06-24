import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { redis } from '../config/redis';

let initialized = false;

const init = (): boolean => {
  if (initialized) return true;
  if (getApps().length > 0) { initialized = true; return true; }
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) return false;
  try {
    const serviceAccount = JSON.parse(Buffer.from(sa, 'base64').toString('utf-8'));
    initializeApp({ credential: cert(serviceAccount) });
    initialized = true;
    return true;
  } catch {
    return false;
  }
};

export const sendPushToUser = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> => {
  if (!init()) return false;
  const token = await redis.get(`fcm:${userId}`);
  if (!token) return false;
  try {
    await getMessaging().send({ token, notification: { title, body }, data });
    return true;
  } catch {
    return false;
  }
};

export const sendPushToMany = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> => {
  if (!init() || userIds.length === 0) return;
  const pipeline = redis.pipeline();
  for (const id of userIds) pipeline.get(`fcm:${id}`);
  const results = await pipeline.exec();
  const tokens: string[] = [];
  results?.forEach((r) => {
    if (r[0] === null && typeof r[1] === 'string' && r[1]) tokens.push(r[1]);
  });
  if (tokens.length === 0) return;
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));
  for (const chunk of chunks) {
    await getMessaging().sendEachForMulticast({
      tokens: chunk, notification: { title, body }, data,
    });
  }
};
