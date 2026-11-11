const express = require('express');
const { AppDataSource } = require('../data-source');
const Inspection = require('../entities/Inspection');
const { validateBody, validateQuery } = require('../middleware/validate');
const { updateInspection, listInspections: listInspectionsQuery } = require('../schemas/inspection');
const { HttpError, parseId } = require('../utils/httpError');

const router = express.Router();
const repo = () => AppDataSource.getRepository(Inspection);

const meta = (q, total) => ({ page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) });

const baseQuery = () =>
  repo().createQueryBuilder('i').leftJoin('i.site', 'site').addSelect(['site.id', 'site.name']);

async function getOr404(id) {
  const item = await baseQuery().where('i.id = :id', { id }).getOne();
  if (!item) throw HttpError.notFound('Inspection', id);
  return item;
}

async function listInspections(query, fixed = {}) {
  const q = { ...query, ...fixed };
  if (q.from && q.to && q.from > q.to) throw HttpError.badRequest("'from' must not be later than 'to'");

  const qb = baseQuery();
  if (q.siteId) qb.andWhere('i.siteId = :siteId', { siteId: q.siteId });
  if (q.result) qb.andWhere('i.result = :result', { result: q.result });
  if (q.from) qb.andWhere('i.inspectedAt >= :from', { from: q.from });
  if (q.to) qb.andWhere('i.inspectedAt <= :to', { to: q.to });
  qb.orderBy(`i.${q.sort}`, q.order)
    .addOrderBy('i.id', q.order)
    .skip((q.page - 1) * q.limit)
    .take(q.limit);
  const [data, total] = await qb.getManyAndCount();
  return { data, meta: meta(q, total) };
}

async function createInspectionFor(siteId, body) {
  const saved = await repo().save(
    repo().create({
      siteId,
      inspector: body.inspector,
      inspectedAt: body.inspectedAt,
      result: body.result,
      notes: body.notes ?? null,
    })
  );
  return getOr404(saved.id);
}

router.get('/', validateQuery(listInspectionsQuery), async (req, res) => {
  res.json(await listInspections(res.locals.query));
});

router.get('/:id', async (req, res) => {
  res.json(await getOr404(parseId(req.params.id)));
});

router.patch('/:id', validateBody(updateInspection, { requireAny: true }), async (req, res) => {
  const id = parseId(req.params.id);
  await getOr404(id);
  await repo().update(id, req.body);
  res.json(await getOr404(id));
});

router.delete('/:id', async (req, res) => {
  const result = await repo().delete(parseId(req.params.id));
  if (!result.affected) throw HttpError.notFound('Inspection', req.params.id);
  res.status(204).send();
});

module.exports = router;
module.exports.listInspections = listInspections;
module.exports.createInspectionFor = createInspectionFor;
