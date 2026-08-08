export class ApiError extends Error {
    statusCode;
    success;
    errors;
    isOperational;
    constructor(statusCode, message = 'Something went wrong', errors = [], stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.errors = errors;
        this.isOperational = true;
        if (stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
