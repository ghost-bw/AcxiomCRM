import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for auth routes
  message: {
    success: false,
    message: 'Too many authentication requests from this IP, please try again after 15 minutes.',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs for general API
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    errors: [],
  },
  standardHeaders: true,
  legacyHeaders: false,
});
