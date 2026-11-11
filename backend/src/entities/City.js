const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'City',
  tableName: 'cities',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    name: { type: 'varchar', length: 100, unique: true },
    region: { type: 'varchar', length: 100, nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
  relations: {

    sites: { type: 'one-to-many', target: 'Site', inverseSide: 'city' },
  },
});
