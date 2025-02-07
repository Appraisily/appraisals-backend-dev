const { AppError } = require('../services/error');

function errorHandler(err, req, res, next) {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    details: err.details
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle specific error types
  if (err.name === 'SyntaxError') {
    return res.status(400).json({
      error: {
        message: 'Invalid JSON',
        details: err.message
      }
    });
  }

  // Default error response
  res.status(500).json({
    error: {
      message: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  });
}

module.exports = errorHandler;