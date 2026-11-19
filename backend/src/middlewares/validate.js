import { sendError } from '../utils/apiResponse.js';

export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const parsed = await schema.parseAsync(data);
      if (source === 'body') req.body = parsed;
      else if (source === 'query') req.query = parsed;
      else req.params = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const errorDetails = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return sendError(res, 'Validation failed', errorDetails, 400);
      }
      return sendError(res, err.message || 'Validation error', [], 400);
    }
  };
};
