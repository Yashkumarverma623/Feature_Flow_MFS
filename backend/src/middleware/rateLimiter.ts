import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Standard error handler returning prompt-compliant error format
const limitReachedHandler = (req: Request, res: Response) => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again later.',
      requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
    },
  });
};

// Rate limiter for auth endpoints (login, register)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitReachedHandler,
});

// Rate limiter for flag mutations
export const mutationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitReachedHandler,
});

// Rate limiter for high-throughput evaluation API
export const evaluationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500000, // High throughput allowance for client-side evaluation spikes & load testing
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitReachedHandler,
});

// Rate limiter for experiment event ingestion
export const eventRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitReachedHandler,
});
