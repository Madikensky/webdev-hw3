const { EntitySchema } = require('typeorm');
const { EQUIPMENT_TYPES, EQUIPMENT_STATUSES } = require('../constants');

const list = (values) => values.map((v) => `'${v}'`).join(', ');

module.exports = new EntitySchema({
  name: 'Equipment',
  tableName: 'equipment',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    siteId: { name: 'site_id', type: 'int' },
    type: { type: 'varchar', length: 30 },
    model: { type: 'varchar', length: 100 },
    serialNumber: { name: 'serial_number', type: 'varchar', length: 100, unique: true },
    status: { type: 'varchar', length: 30, default: 'working' },
    installedAt: { name: 'installed_at', type: 'date', nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
  checks: [
    { expression: `"type" IN (${list(EQUIPMENT_TYPES)})` },
    { expression: `"status" IN (${list(EQUIPMENT_STATUSES)})` },
  ],
  indices: [{ columns: ['siteId'] }],
  relations: {

    site: {
      type: 'many-to-one',
      target: 'Site',
      joinColumn: { name: 'site_id' },
      nullable: false,
      onDelete: 'CASCADE',
      inverseSide: 'equipment',
    },
  },
});
