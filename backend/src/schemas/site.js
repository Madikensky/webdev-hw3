const { z } = require('zod');
const { SITE_STATUSES } = require('../constants');
const { positiveInt, requiredString, nullableString, queryInt, paginationShape } = require('./common');

const siteShape = {
  name: requiredString(255),
  address: nullableString(500).optional(),
  cityId: positiveInt.nullable().optional(),
  status: z.enum(SITE_STATUSES).optional(),
};

const siteBody = z.object(siteShape).strict();

const updateSite = z.object(siteShape).partial().strict();

const listSites = z
  .object({
    ...paginationShape('ASC'),
    search: z.string().trim().min(1).max(100).optional(),
    cityId: queryInt(1).optional(),
    status: z.enum(SITE_STATUSES).optional(),
    sort: z.enum(['id', 'name', 'createdAt']).default('id'),
  })
  .strict();

const listCitySites = listSites.omit({ cityId: true });

const deleteSiteQuery = z.object({ force: z.enum(['true', 'false']).default('false') }).strict();

module.exports = { siteBody, updateSite, listSites, listCitySites, deleteSiteQuery };
