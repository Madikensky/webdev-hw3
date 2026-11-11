const { z } = require('zod');
const { EQUIPMENT_TYPES, EQUIPMENT_STATUSES } = require('../constants');
const { positiveInt, dateOnly, requiredString, queryInt, paginationShape } = require('./common');

const equipmentShape = {
  type: z.enum(EQUIPMENT_TYPES),
  model: requiredString(100),
  serialNumber: requiredString(100),
  status: z.enum(EQUIPMENT_STATUSES).optional(),
  installedAt: dateOnly.nullable().optional(),
};

const equipmentBody = z.object(equipmentShape).strict();

const updateEquipment = z
  .object({ ...equipmentShape, siteId: positiveInt })
  .partial()
  .strict();

const listEquipment = z
  .object({
    ...paginationShape('ASC'),
    siteId: queryInt(1).optional(),
    type: z.enum(EQUIPMENT_TYPES).optional(),
    status: z.enum(EQUIPMENT_STATUSES).optional(),
    search: z.string().trim().min(1).max(100).optional(),
    sort: z.enum(['id', 'model', 'installedAt', 'createdAt']).default('id'),
  })
  .strict();

const listSiteEquipment = listEquipment.omit({ siteId: true });

module.exports = { equipmentBody, updateEquipment, listEquipment, listSiteEquipment };
