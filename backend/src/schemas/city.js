const { z } = require('zod');
const { requiredString, nullableString, paginationShape } = require('./common');

const cityShape = {
  name: requiredString(100),
  region: nullableString(100).optional(),
};

const createCity = z.object(cityShape).strict();

const updateCity = z.object(cityShape).partial().strict();

const listCities = z.object({ ...paginationShape('ASC') }).strict();

module.exports = { createCity, updateCity, listCities };
