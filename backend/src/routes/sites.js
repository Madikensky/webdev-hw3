const express = require('express');
const { AppDataSource } = require('../data-source');
const City = require('../entities/City');
const Site = require('../entities/Site');
const Equipment = require('../entities/Equipment');
const Inspection = require('../entities/Inspection');
const { validateBody, validateQuery } = require('../middleware/validate');
const { siteBody, updateSite, listSites: listSitesQuery, deleteSiteQuery } = require('../schemas/site');
const { equipmentBody, listSiteEquipment } = require('../schemas/equipment');
const { createInspection, listSiteInspections } = require('../schemas/inspection');
const { HttpError, parseId } = require('../utils/httpError');
const { listEquipment, createEquipment } = require('./equipment');
const { listInspections, createInspectionFor } = require('./inspections');

const router = express.Router();
const sites = () => AppDataSource.getRepository(Site);
const cities = () => AppDataSource.getRepository(City);

const meta = (q, total) => ({ page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) });

async function requireCity(cityId) {
  if (cityId === null || cityId === undefined) return;
  if (!(await cities().existsBy({ id: cityId }))) {
    throw HttpError.badRequest(`City with id ${cityId} does not exist`, [
      { field: 'cityId', messages: [`city ${cityId} not found`] },
    ]);
  }
}

async function withStats(list) {
  if (list.length === 0) return [];
  const ids = list.map((s) => s.id);

  const equipmentRows = await AppDataSource.query(
    `SELECT site_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'faulty') AS faulty
       FROM equipment WHERE site_id = ANY($1) GROUP BY site_id`,
    [ids]
  );
  const inspectionRows = await AppDataSource.query(
    `SELECT site_id, COUNT(*) AS total FROM inspections WHERE site_id = ANY($1) GROUP BY site_id`,
    [ids]
  );
  const lastRows = await AppDataSource.query(
    `SELECT DISTINCT ON (site_id) site_id, id, inspected_at, result
       FROM inspections WHERE site_id = ANY($1)
      ORDER BY site_id, inspected_at DESC, id DESC`,
    [ids]
  );

  const eq = new Map(equipmentRows.map((r) => [r.site_id, r]));
  const ins = new Map(inspectionRows.map((r) => [r.site_id, r]));
  const last = new Map(lastRows.map((r) => [r.site_id, r]));

  return list.map((s) => ({
    ...s,
    equipmentCount: Number(eq.get(s.id)?.total || 0),
    faultyEquipmentCount: Number(eq.get(s.id)?.faulty || 0),
    inspectionCount: Number(ins.get(s.id)?.total || 0),
    lastInspection: last.has(s.id)
      ? {
          id: last.get(s.id).id,
          inspectedAt: last.get(s.id).inspected_at,
          result: last.get(s.id).result,
        }
      : null,
  }));
}

async function getSiteOr404(id) {
  const site = await sites().findOne({ where: { id }, relations: { city: true } });
  if (!site) throw HttpError.notFound('Site', id);
  const [view] = await withStats([site]);
  return view;
}

async function assertSiteExists(id) {
  if (!(await sites().existsBy({ id }))) throw HttpError.notFound('Site', id);
}

async function listSites(query, fixed = {}) {
  const q = { ...query, ...fixed };
  const qb = sites().createQueryBuilder('site').leftJoinAndSelect('site.city', 'city');
  if (q.cityId) qb.andWhere('site.cityId = :cityId', { cityId: q.cityId });
  if (q.status) qb.andWhere('site.status = :status', { status: q.status });
  if (q.search) {
    qb.andWhere('(site.name ILIKE :s OR site.address ILIKE :s)', { s: `%${q.search}%` });
  }
  qb.orderBy(`site.${q.sort}`, q.order)
    .addOrderBy('site.id', 'ASC')
    .skip((q.page - 1) * q.limit)
    .take(q.limit);
  const [data, total] = await qb.getManyAndCount();
  return { data: await withStats(data), meta: meta(q, total) };
}

router.get('/', validateQuery(listSitesQuery), async (req, res) => {
  res.json(await listSites(res.locals.query));
});

router.get('/:id', async (req, res) => {
  res.json(await getSiteOr404(parseId(req.params.id)));
});

router.post('/', validateBody(siteBody), async (req, res) => {
  const { name, address, cityId, status } = req.body;
  await requireCity(cityId);
  const saved = await sites().save(
    sites().create({
      name,
      address: address ?? null,
      cityId: cityId ?? null,
      status: status ?? 'active',
    })
  );
  res.status(201).location(`/api/sites/${saved.id}`).json(await getSiteOr404(saved.id));
});

router.put('/:id', validateBody(siteBody), async (req, res) => {
  const id = parseId(req.params.id);
  await assertSiteExists(id);
  const { name, address, cityId, status } = req.body;
  await requireCity(cityId);
  await sites().update(id, {
    name,
    address: address ?? null,
    cityId: cityId ?? null,
    status: status ?? 'active',
  });
  res.json(await getSiteOr404(id));
});

router.patch('/:id', validateBody(updateSite, { requireAny: true }), async (req, res) => {
  const id = parseId(req.params.id);
  await assertSiteExists(id);
  await requireCity(req.body.cityId);
  await sites().update(id, req.body);
  res.json(await getSiteOr404(id));
});

router.delete('/:id', validateQuery(deleteSiteQuery), async (req, res) => {
  const id = parseId(req.params.id);
  await assertSiteExists(id);
  if (res.locals.query.force !== 'true') {
    const equipment = await AppDataSource.getRepository(Equipment).countBy({ siteId: id });
    const inspections = await AppDataSource.getRepository(Inspection).countBy({ siteId: id });
    if (equipment + inspections > 0) {
      throw HttpError.conflict(
        `Site ${id} still has ${equipment} equipment item(s) and ${inspections} inspection(s). ` +
          'Delete them first, or pass ?force=true to delete them together with the site.'
      );
    }
  }
  await sites().delete(id);
  res.status(204).send();
});

router.get('/:id/equipment', validateQuery(listSiteEquipment), async (req, res) => {
  const id = parseId(req.params.id);
  await assertSiteExists(id);
  res.json(await listEquipment(res.locals.query, { siteId: id }));
});

router.post('/:id/equipment', validateBody(equipmentBody), async (req, res) => {
  const id = parseId(req.params.id);
  await assertSiteExists(id);
  const item = await createEquipment(id, req.body);
  res.status(201).location(`/api/equipment/${item.id}`).json(item);
});

router.get('/:id/inspections', validateQuery(listSiteInspections), async (req, res) => {
  const id = parseId(req.params.id);
  await assertSiteExists(id);
  res.json(await listInspections(res.locals.query, { siteId: id }));
});

router.post('/:id/inspections', validateBody(createInspection), async (req, res) => {
  const id = parseId(req.params.id);
  await assertSiteExists(id);
  const inspection = await createInspectionFor(id, req.body);
  res.status(201).location(`/api/inspections/${inspection.id}`).json(inspection);
});

module.exports = router;
module.exports.listSites = listSites;
