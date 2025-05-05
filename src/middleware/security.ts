import { config } from '../config';
import { checkRateLimit, validateCSRFToken } from '../utils/security';

// Rate limiting middleware
export const rateLimiter = (key: string, limit = 100, windowMs = 60000) => {
  if (!checkRateLimit(key, limit, windowMs)) {
    throw new Error('Too many requests');
  }
};

// CSRF protection middleware
export const csrfProtection = (token: string) => {
  const storedToken = localStorage.getItem('csrf_token');
  if (!storedToken || !validateCSRFToken(token, storedToken)) {
    throw new Error('Invalid CSRF token');
  }
};

// Request validation middleware
export const validateRequest = async (req: Request) => {
  // Validate origin
  const origin = req.headers.get('origin');
  if (origin && !config.app.allowedOrigins.includes(origin)) {
    throw new Error('Invalid origin');
  }

  // Validate content type
  const contentType = req.headers.get('content-type');
  if (req.method !== 'GET' && !contentType?.includes('application/json')) {
    throw new Error('Invalid content type');
  }

  // Rate limiting
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
  rateLimiter(clientIP);

  // CSRF protection for mutations
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken) {
      throw new Error('Missing CSRF token');
    }
    csrfProtection(csrfToken);
  }
};