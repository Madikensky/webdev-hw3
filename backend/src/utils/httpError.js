class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }

  static validation(details) {
    return new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }

  static notFound(entity, id) {
    const suffix = id !== undefined ? ` with id ${id}` : '';
    return new HttpError(404, 'NOT_FOUND', `${entity}${suffix} not found`);
  }

  static conflict(message) {
    return new HttpError(409, 'CONFLICT', message);
  }
}

function parseId(raw, name = 'id') {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw HttpError.badRequest(`Path parameter '${name}' must be a positive integer`);
  }
  const id = Number(raw);
  if (id < 1 || id > 2147483647) {
    throw HttpError.badRequest(`Path parameter '${name}' is out of range`);
  }
  return id;
}

module.exports = { HttpError, parseId };
