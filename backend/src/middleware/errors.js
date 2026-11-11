const { QueryFailedError } = require('typeorm');
const { HttpError } = require('../utils/httpError');

function send(res, err) {
  res.status(err.status).json({
    error: {
      status: err.status,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

function notFoundHandler(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';
const PG_STRING_TOO_LONG = '22001';

function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return send(res, err);

  if (err && err.type === 'entity.parse.failed') {
    return send(res, HttpError.badRequest('Malformed JSON in request body'));
  }
  if (err && err.type === 'entity.too.large') {
    return send(res, new HttpError(413, 'BAD_REQUEST', 'Request body too large'));
  }

  if (err instanceof QueryFailedError) {
    const pg = err.driverError || {};
    switch (pg.code) {
      case PG_UNIQUE_VIOLATION:
        return send(res, HttpError.conflict(pg.detail || 'Resource already exists'));
      case PG_FOREIGN_KEY_VIOLATION:
        return send(res, HttpError.conflict(pg.detail || 'Related resource constraint violated'));
      case PG_CHECK_VIOLATION:
      case PG_STRING_TOO_LONG:
        return send(res, HttpError.badRequest(pg.detail || 'Value violates a database constraint'));
      default:
    }
  }

  console.error(err);
  return send(res, new HttpError(500, 'INTERNAL_SERVER_ERROR', 'Internal server error'));
}

module.exports = { notFoundHandler, errorHandler };
