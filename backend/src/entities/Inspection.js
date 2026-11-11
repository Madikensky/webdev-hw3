const { EntitySchema } = require('typeorm');
const { INSPECTION_RESULTS } = require('../constants');

const list = (values) => values.map((v) => `'${v}'`).join(', ');

module.exports = new EntitySchema({
  name: 'Inspection',
  tableName: 'inspections',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    siteId: { name: 'site_id', type: 'int' },
    inspector: { type: 'varchar', length: 100 },
    inspectedAt: { name: 'inspected_at', type: 'date' },
    result: { type: 'varchar', length: 30 },
    notes: { type: 'text', nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
  checks: [{ expression: `"result" IN (${list(INSPECTION_RESULTS)})` }],
  indices: [{ columns: ['siteId'] }, { columns: ['inspectedAt'] }],
  relations: {

    site: {
      type: 'many-to-one',
      target: 'Site',
      joinColumn: { name: 'site_id' },
      nullable: false,
      onDelete: 'CASCADE',
      inverseSide: 'inspections',
    },
  },
});
