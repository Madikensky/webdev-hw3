const { z } = require('zod');
const { INSPECTION_RESULTS } = require('../constants');
const { dateOnly, requiredString, nullableString, queryInt, paginationShape } = require('./common');

const inspectionShape = {
  inspector: requiredString(100),
  inspectedAt: dateOnly,
  result: z.enum(INSPECTION_RESULTS),
  notes: nullableString(2000).optional(),
};

const createInspection = z.object(inspectionShape).strict();

const updateInspection = z.object(inspectionShape).partial().strict();

const listInspections = z
  .object({
    ...paginationShape('DESC'),
    siteId: queryInt(1).optional(),
    result: z.enum(INSPECTION_RESULTS).optional(),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    sort: z.enum(['inspectedAt', 'id', 'createdAt']).default('inspectedAt'),
  })
  .strict();

const listSiteInspections = listInspections.omit({ siteId: true });

module.exports = { createInspection, updateInspection, listInspections, listSiteInspections };
