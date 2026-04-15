import crypto from 'node:crypto';

export function createOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}
