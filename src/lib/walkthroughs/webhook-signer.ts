import 'server-only';
import crypto from 'crypto';

function getSecret(): string {
  const s = process.env.WALKTHROUGH_WEBHOOK_SECRET;
  if (!s) throw new Error('WALKTHROUGH_WEBHOOK_SECRET not set');
  return s;
}

export function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function verify(payload: string, signature: string): boolean {
  if (!signature) return false;
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }
  if (signature.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
