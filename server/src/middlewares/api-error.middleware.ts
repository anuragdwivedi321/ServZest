import { ErrorRequestHandler } from 'express';

export const apiErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  const databaseErrors: Record<string, [number, string]> = {
    P2025: [404, 'The requested record was not found. Refresh and try again.'],
    P2002: [409, 'This record already exists. Refresh before retrying.'],
    P2003: [409, 'This change conflicts with a related record.'],
    P1001: [503, 'Database temporarily unavailable. Please retry.'],
    P1002: [503, 'Database temporarily unavailable. Please retry.'],
    P2024: [503, 'Server is busy. Please retry shortly.'],
    P2028: [503, 'The operation timed out. Refresh its status before retrying.'],
  };
  const known = databaseErrors[error?.code];
  if (known) { res.status(known[0]).json({ success: false, message: known[1] }); return; }
  if (error?.type === 'entity.parse.failed') { res.status(400).json({ success: false, message: 'Invalid JSON request body.' }); return; }
  if (error?.type === 'entity.too.large') { res.status(413).json({ success: false, message: 'Request is too large.' }); return; }
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500) console.error('API request failed:', error?.message);
  res.status(status).json({ success: false, message: status < 500 ? error.message : 'Request failed. Please retry.' });
};
