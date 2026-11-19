export const sendSuccess = (
  res,
  message,
  data = undefined,
  meta = undefined,
  statusCode = 200
) => {
  const response = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res,
  message,
  errors = [],
  statusCode = 400
) => {
  const response = {
    success: false,
    message,
    errors,
  };
  return res.status(statusCode).json(response);
};

export class AppError extends Error {
  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
