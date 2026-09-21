import { revealSensitive } from './sensitive-data.service';

/**
 * Worker identity data must never be returned verbatim by a general profile API.
 * The database value is kept for verification, while clients receive only the
 * submission state and (for admins) a masked identifier.
 */
export function safeWorkerProfile<T extends Record<string, any>>(
  profile: T | null,
  options: { includeMaskedAadhaar?: boolean } = {}
) {
  if (!profile) return null;

  const { aadhaarNumber, aadhaarDocUrl: _aadhaarDocUrl, identityLast4, ...safe } = profile;
  let lastFour = typeof identityLast4 === 'string' ? identityLast4 : '';
  if (typeof aadhaarNumber === 'string') {
    try { lastFour = revealSensitive(aadhaarNumber).slice(-4); } catch { /* Treat unreadable legacy data as unavailable. */ }
  }

  return {
    ...safe,
    hasSubmittedKyc: Boolean(identityLast4 || aadhaarNumber),
    ...(options.includeMaskedAadhaar
      ? { maskedAadhaar: lastFour ? `XXXX XXXX ${lastFour}` : null }
      : {}),
  };
}
