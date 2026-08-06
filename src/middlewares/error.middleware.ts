import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new ApiError(404, `Route not found: [${req.method}] ${req.originalUrl}`);
  next(error);
};

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error: ApiError;

  if (err instanceof ApiError) {
    error = err;
  } else {
    // Handle Mongoose Bad ObjectId (CastError)
    if (err.name === 'CastError') {
      const message = `Resource not found. Invalid ${err.path}: ${err.value}`;
      error = new ApiError(400, message);
    }
    // Handle Mongoose Duplicate Key Error
    else if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      const message = `Duplicate entry: A record with this ${field} already exists.`;
      error = new ApiError(409, message);
    }
    // Handle Mongoose Validation Error
    else if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors || {}).map((el: any) => el.message);
      error = new ApiError(400, 'Database Validation Error', errors);
    }
    // Handle JWT Signature Error
    else if (err.name === 'JsonWebTokenError') {
      error = new ApiError(401, 'Invalid authentication token');
    }
    // Handle JWT Expired Error
    else if (err.name === 'TokenExpiredError') {
      error = new ApiError(401, 'Authentication token has expired');
    }
    // Handle Generic Unhandled Server Errors
    else {
      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      error = new ApiError(statusCode, message, [], err.stack);
    }
  }

  const responsePayload = {
    statusCode: error.statusCode,
    success: false,
    message: error.message,
    errors: error.errors,
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(error.statusCode).json(responsePayload);
};