import * as expressRateLimit from "express-rate-limit";

function createRateLimiter(options?: any) {
  const rl = (expressRateLimit as any).default ?? expressRateLimit;
  return (rl as any)(options);
}

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

export const strictLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
});
