const { EntitySchema } = require('typeorm');
const { SITE_STATUSES } = require('../constants');

const list = (values) => values.map((v) => `'${v}'`).join(', ');

module.exports = new EntitySchema({
  name: 'Site',
  tableName: 'sites',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    name: { type: 'varchar', length: 255 },
    address: { type: 'text', nullable: true },
    cityId: { name: 'city_id', type: 'int', nullable: true },
    status: { type: 'varchar', length: 50, default: 'active' },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
  checks: [{ expression: `"status" IN (${list(SITE_STATUSES)})` }],
  indices: [{ columns: ['cityId'] }, { columns: ['status'] }],
  relations: {

    city: {
      type: 'many-to-one',
      target: 'City',
      joinColumn: { name: 'city_id' },
      nullable: true,
      onDelete: 'RESTRICT',
      inverseSide: 'sites',
    },

    equipment: { type: 'one-to-many', target: 'Equipment', inverseSide: 'site' },

    inspections: { type: 'one-to-many', target: 'Inspection', inverseSide: 'site' },
  },
});
