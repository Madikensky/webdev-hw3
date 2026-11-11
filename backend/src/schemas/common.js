const { z } = require('zod');

z.config({
  customError: (issue) =>
    issue.code === 'invalid_type' && issue.input === undefined ? 'is required' : undefined,
});

const positiveInt = z.number().int().min(1).max(2147483647);

const isRealDate = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date in YYYY-MM-DD format')
  .refine(isRealDate, 'must be a valid calendar date');

const requiredString = (max) => z.string().trim().min(1, 'must not be empty').max(max);

const nullableString = (max) => z.string().trim().max(max).nullable();

const queryInt = (min = 1, max = 2147483647) => z.coerce.number().int().min(min).max(max);

const orderParam = (fallback) =>
  z
    .enum(['ASC', 'DESC', 'asc', 'desc'])
    .transform((v) => v.toUpperCase())
    .default(fallback);

const paginationShape = (defaultOrder = 'ASC') => ({
  page: queryInt(1).default(1),
  limit: queryInt(1, 100).default(20),
  order: orderParam(defaultOrder),
});

module.exports = {
  positiveInt,
  dateOnly,
  requiredString,
  nullableString,
  queryInt,
  paginationShape,
};
