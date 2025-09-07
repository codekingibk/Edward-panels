
import crypto from 'crypto';

export interface DeviceFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  ipAddress: string;
  screenResolution?: string;
  timezone?: string;
  platform?: string;
  colorDepth?: string;
  deviceMemory?: string;
  hardwareConcurrency?: string;
}

export function generateFingerprint(req: any, clientFingerprint?: Partial<DeviceFingerprint>): string {
  const fingerprint: DeviceFingerprint = {
    userAgent: req.headers['user-agent'] || '',
    acceptLanguage: req.headers['accept-language'] || '',
    acceptEncoding: req.headers['accept-encoding'] || '',
    ipAddress: getClientIP(req),
    ...clientFingerprint
  };

  // Create a hash of the fingerprint data
  const fingerprintString = JSON.stringify(fingerprint);
  return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}

export function getClientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

export function calculateSimilarity(fp1: string, fp2: string): number {
  if (fp1 === fp2) return 1.0;
  
  // Simple similarity check based on common characters
  const set1 = new Set(fp1);
  const set2 = new Set(fp2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}
