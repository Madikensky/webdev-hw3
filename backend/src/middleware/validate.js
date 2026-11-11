const { HttpError } = require('../utils/httpError');

function toDetails(issues) {
  const byField = new Map();
  for (const issue of issues) {
    let field = issue.path.join('.') || '(body)';

    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        const f = [...issue.path, key].join('.');
        byField.set(f, [...(byField.get(f) || []), `property ${key} is not allowed`]);
      }
      continue;
    }
    byField.set(field, [...(byField.get(field) || []), issue.message]);
  }
  return [...byField].map(([field, messages]) => ({ field, messages }));
}

function validateBody(schema, { requireAny = false } = {}) {
  return (req, res, next) => {
    const body = req.body === undefined ? {} : req.body;
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw HttpError.badRequest('Request body must be a JSON object (Content-Type: application/json)');
    }
    if (requireAny && Object.keys(body).length === 0) {
      throw HttpError.badRequest('Request body must contain at least one field to update');
    }
    const result = schema.safeParse(body);
    if (!result.success) throw HttpError.validation(toDetails(result.error.issues));
    req.body = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) throw HttpError.validation(toDetails(result.error.issues));
    res.locals.query = result.data;
    next();
  };
}

module.exports = { validateBody, validateQuery };
