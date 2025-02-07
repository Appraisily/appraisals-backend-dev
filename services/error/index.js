class AppError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message, details = {}) {
    super(message, 401, details);
  }
}

class NotFoundError extends AppError {
  constructor(message, details = {}) {
    super(message, 404, details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError
};