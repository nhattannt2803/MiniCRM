import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV === 'development';

// General API rate limiter (1000 requests per 15 minutes per IP on prod, skipped in dev)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 500, // Very generous limit for dev/prod
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: () => isDev, // Skip rate limiting in local development mode
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.',
    },
  },
});

// Strict rate limiter for sensitive authentication routes (50 requests per 15 minutes per IP on prod, skipped in dev)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 50, // Limit each IP for auth requests
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev, // Skip rate limiting in local development mode
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Quá nhiều thử nghiệm đăng nhập/xác thực. Vui lòng thử lại sau 15 phút.',
    },
  },
});
