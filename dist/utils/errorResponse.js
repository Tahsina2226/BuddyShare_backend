"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.ErrorResponse = void 0;
class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.ErrorResponse = ErrorResponse;
const createError = (message, statusCode) => {
    return new ErrorResponse(message, statusCode);
};
exports.createError = createError;
