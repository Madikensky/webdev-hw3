const { AppDataSource } = require('./data-source');
const City = require('./entities/City');
const Site = require('./entities/Site');
const Equipment = require('./entities/Equipment');
const Inspection = require('./entities/Inspection');

async function insertSampleData() {
  const cities = await AppDataSource.getRepository(City).save([
    { name: 'Almaty', region: 'Almaty' },
    { name: 'Astana', region: 'Akmola' },
    { name: 'Shymkent', region: 'Turkistan' },
    { name: 'Karaganda', region: 'Karaganda' },
  ]);
  const [almaty, astana, shymkent] = cities;

  const sites = await AppDataSource.getRepository(Site).save([
    { name: 'Central Tower', address: '12 Abay Ave', cityId: almaty.id, status: 'active' },
    { name: 'North Plant', address: '5 Lenin St', cityId: astana.id, status: 'active' },
    { name: 'Southern Hub', address: '41 Tauke Khan Ave', cityId: shymkent.id, status: 'under_construction' },
    { name: 'Old Depot', address: '7 Zhandosov St', cityId: almaty.id, status: 'decommissioned' },
    { name: 'Roof Antenna 17', address: null, cityId: null, status: 'inactive' },
  ]);
  const [tower, plant, hub] = sites;

  await AppDataSource.getRepository(Equipment).save([
    { siteId: tower.id, type: 'antenna', model: 'Huawei AAU5613', serialNumber: 'HW-AAU-0001', status: 'working', installedAt: '2025-03-12' },
    { siteId: tower.id, type: 'router', model: 'Cisco ASR 920', serialNumber: 'CS-ASR-0042', status: 'faulty', installedAt: '2024-11-02' },
    { siteId: tower.id, type: 'battery', model: 'Narada 48V 200Ah', serialNumber: 'NR-BAT-0310', status: 'working', installedAt: '2025-06-20' },
    { siteId: plant.id, type: 'switch', model: 'Juniper EX4300', serialNumber: 'JN-EX-0007', status: 'working', installedAt: '2023-09-15' },
    { siteId: plant.id, type: 'power_unit', model: 'Eltek Flatpack2', serialNumber: 'EL-FP-0120', status: 'working', installedAt: null },
    { siteId: hub.id, type: 'antenna', model: 'Ericsson AIR 3268', serialNumber: 'ER-AIR-0555', status: 'working', installedAt: '2026-09-30' },
  ]);

  await AppDataSource.getRepository(Inspection).save([
    { siteId: tower.id, inspector: 'Aigerim S.', inspectedAt: '2026-08-14', result: 'passed', notes: 'All systems normal.' },
    { siteId: tower.id, inspector: 'Daniyar K.', inspectedAt: '2026-10-20', result: 'needs_attention', notes: 'Router fans are noisy; replacement scheduled.' },
    { siteId: plant.id, inspector: 'Aigerim S.', inspectedAt: '2026-10-05', result: 'passed', notes: null },
    { siteId: hub.id, inspector: 'Timur B.', inspectedAt: '2026-10-28', result: 'failed', notes: 'Grounding does not meet requirements.' },
  ]);

  return { cities: cities.length, sites: sites.length, equipment: 6, inspections: 4 };
}

async function seedIfEmpty() {
  if ((await AppDataSource.getRepository(City).count()) > 0 || (await AppDataSource.getRepository(Site).count()) > 0) {
    return false;
  }
  const counts = await insertSampleData();
  console.log('Seeded sample data:', counts);
  return true;
}

async function resetAndSeed() {
  await AppDataSource.query(
    'TRUNCATE TABLE inspections, equipment, sites, cities RESTART IDENTITY CASCADE'
  );
  const counts = await insertSampleData();
  console.log('Database reset. Seeded sample data:', counts);
}

module.exports = { seedIfEmpty, resetAndSeed };

if (require.main === module) {
  (async () => {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    await resetAndSeed();
    await AppDataSource.destroy();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
