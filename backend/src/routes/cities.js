const express = require('express');
const { AppDataSource } = require('../data-source');
const City = require('../entities/City');
const Site = require('../entities/Site');
const { validateBody, validateQuery } = require('../middleware/validate');
const { createCity, updateCity, listCities } = require('../schemas/city');
const { listCitySites } = require('../schemas/site');
const { HttpError, parseId } = require('../utils/httpError');
const { listSites } = require('./sites');

const router = express.Router();
const cities = () => AppDataSource.getRepository(City);
const sites = () => AppDataSource.getRepository(Site);

const meta = (q, total) => ({ page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) });

async function assertNameFree(name, exceptId) {
  const existing = await cities()
    .createQueryBuilder('c')
    .where('LOWER(c.name) = LOWER(:name)', { name })
    .getOne();
  if (existing && existing.id !== exceptId) {
    throw HttpError.conflict(`City '${existing.name}' already exists (id ${existing.id})`);
  }
}

async function withSiteCounts(list) {
  if (list.length === 0) return [];
  const rows = await sites()
    .createQueryBuilder('s')
    .select('s.cityId', 'cityId')
    .addSelect('COUNT(s.id)', 'count')
    .where('s.cityId IN (:...ids)', { ids: list.map((c) => c.id) })
    .groupBy('s.cityId')
    .getRawMany();
  const counts = new Map(rows.map((r) => [Number(r.cityId), Number(r.count)]));
  return list.map((c) => ({ ...c, siteCount: counts.get(c.id) || 0 }));
}

async function getCityOr404(id) {
  const city = await cities().findOneBy({ id });
  if (!city) throw HttpError.notFound('City', id);
  const [view] = await withSiteCounts([city]);
  return view;
}

router.get('/', validateQuery(listCities), async (req, res) => {
  const q = res.locals.query;
  const [data, total] = await cities()
    .createQueryBuilder('c')
    .orderBy('c.name', q.order)
    .addOrderBy('c.id', 'ASC')
    .skip((q.page - 1) * q.limit)
    .take(q.limit)
    .getManyAndCount();
  res.json({ data: await withSiteCounts(data), meta: meta(q, total) });
});

router.get('/:id', async (req, res) => {
  res.json(await getCityOr404(parseId(req.params.id)));
});

router.post('/', validateBody(createCity), async (req, res) => {
  await assertNameFree(req.body.name);
  const saved = await cities().save(
    cities().create({ name: req.body.name, region: req.body.region ?? null })
  );
  res.status(201).location(`/api/cities/${saved.id}`).json(await getCityOr404(saved.id));
});

router.patch('/:id', validateBody(updateCity, { requireAny: true }), async (req, res) => {
  const id = parseId(req.params.id);
  await getCityOr404(id);
  if (req.body.name !== undefined) await assertNameFree(req.body.name, id);
  await cities().update(id, req.body);
  res.json(await getCityOr404(id));
});

router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  await getCityOr404(id);
  const count = await sites().countBy({ cityId: id });
  if (count > 0) {
    throw HttpError.conflict(`City ${id} still has ${count} site(s). Move or delete them first.`);
  }
  await cities().delete(id);
  res.status(204).send();
});

router.get('/:id/sites', validateQuery(listCitySites), async (req, res) => {
  const id = parseId(req.params.id);
  await getCityOr404(id);
  res.json(await listSites(res.locals.query, { cityId: id }));
});

module.exports = router;
