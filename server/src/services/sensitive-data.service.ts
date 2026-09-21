import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { config } from '../config';

const PREFIX = 'enc:v1:';
const key = createHash('sha256').update(config.kycEncryptionKey).digest();

export function protectSensitive(value: string) {
  if (value.startsWith(PREFIX)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function revealSensitive(value: string) {
  if (!value.startsWith(PREFIX)) return value;
  const [ivValue, tagValue, encryptedValue] = value.slice(PREFIX.length).split(':');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid encrypted identity value');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}
