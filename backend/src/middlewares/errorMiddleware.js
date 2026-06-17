// 404 Route Not Found Middleware
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const normalizeError = (err) => {
  if (!err) return new Error('Unknown server error');
  if (typeof err === 'string') return new Error(err);
  if (err instanceof Error) return err;
  if (typeof err === 'object' && err.message) {
    const e = new Error(String(err.message));
    e.statusCode = err.statusCode || err.status;
    return e;
  }
  if (typeof err === 'object' && err.success === false && err.message) {
    return new Error(String(err.message));
  }
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error('Unknown server error');
  }
};

// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);
  let statusCode =
    error.statusCode ||
    error.status ||
    (res.statusCode === 200 ? 500 : res.statusCode);
  let message = error.message || 'Server error';

  // Handle Mongoose Bad ObjectId (Cast Error)
  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Resource not found: invalid identifier format';
  }

  // Handle Mongoose Duplicate Key Error
  if (error.code === 11000) {
    statusCode = 400;
    const duplicatedFieldName = Object.keys(error.keyValue || {})[0];
    if (duplicatedFieldName === 'email') {
      message = 'An account with this email already exists.';
    } else if (duplicatedFieldName === 'name' || duplicatedFieldName === 'username') {
      message = 'Display names and usernames can be duplicated — restart the API server to apply index fixes, then try again.';
    } else {
      message = `Duplicate value for '${duplicatedFieldName}'.`;
    }
  }

  // Handle Mongoose Validation Error
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map((val) => val.message).join(', ');
  }

  console.error(`[SYSTEM ERROR] ${req.method} ${req.originalUrl}:`, message);
  if (error.stack) console.error(error.stack);

  if (res.headersSent) {
    return next(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : error.stack
  });
};

module.exports = { notFound, errorHandler };
