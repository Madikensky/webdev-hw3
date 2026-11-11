const express = require('express');
const { AppDataSource } = require('../data-source');
const Equipment = require('../entities/Equipment');
const Site = require('../entities/Site');
const { validateBody, validateQuery } = require('../middleware/validate');
const { equipmentBody, updateEquipment, listEquipment: listEquipmentQuery } = require('../schemas/equipment');
const { HttpError, parseId } = require('../utils/httpError');

const router = express.Router();
const repo = () => AppDataSource.getRepository(Equipment);
const sites = () => AppDataSource.getRepository(Site);

const meta = (q, total) => ({ page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) });

const baseQuery = () =>
  repo().createQueryBuilder('e').leftJoin('e.site', 'site').addSelect(['site.id', 'site.name']);

async function getOr404(id) {
  const item = await baseQuery().where('e.id = :id', { id }).getOne();
  if (!item) throw HttpError.notFound('Equipment', id);
  return item;
}

async function assertSerialFree(serialNumber, exceptId) {
  const existing = await repo().findOneBy({ serialNumber });
  if (existing && existing.id !== exceptId) {
    throw HttpError.conflict(`Serial number '${serialNumber}' is already used by equipment ${existing.id}`);
  }
}

async function requireSite(siteId) {
  if (!(await sites().existsBy({ id: siteId }))) {
    throw HttpError.badRequest(`Site with id ${siteId} does not exist`, [
      { field: 'siteId', messages: [`site ${siteId} not found`] },
    ]);
  }
}

async function listEquipment(query, fixed = {}) {
  const q = { ...query, ...fixed };
  const qb = baseQuery();
  if (q.siteId) qb.andWhere('e.siteId = :siteId', { siteId: q.siteId });
  if (q.type) qb.andWhere('e.type = :type', { type: q.type });
  if (q.status) qb.andWhere('e.status = :status', { status: q.status });
  if (q.search) {
    qb.andWhere('(e.model ILIKE :s OR e.serialNumber ILIKE :s)', { s: `%${q.search}%` });
  }
  qb.orderBy(`e.${q.sort}`, q.order)
    .addOrderBy('e.id', 'ASC')
    .skip((q.page - 1) * q.limit)
    .take(q.limit);
  const [data, total] = await qb.getManyAndCount();
  return { data, meta: meta(q, total) };
}

async function createEquipment(siteId, body) {
  await assertSerialFree(body.serialNumber);
  const saved = await repo().save(
    repo().create({
      siteId,
      type: body.type,
      model: body.model,
      serialNumber: body.serialNumber,
      status: body.status ?? 'working',
      installedAt: body.installedAt ?? null,
    })
  );
  return getOr404(saved.id);
}

router.get('/', validateQuery(listEquipmentQuery), async (req, res) => {
  res.json(await listEquipment(res.locals.query));
});

router.get('/:id', async (req, res) => {
  res.json(await getOr404(parseId(req.params.id)));
});

router.put('/:id', validateBody(equipmentBody), async (req, res) => {
  const id = parseId(req.params.id);
  await getOr404(id);
  await assertSerialFree(req.body.serialNumber, id);
  await repo().update(id, {
    type: req.body.type,
    model: req.body.model,
    serialNumber: req.body.serialNumber,
    status: req.body.status ?? 'working',
    installedAt: req.body.installedAt ?? null,
  });
  res.json(await getOr404(id));
});

router.patch('/:id', validateBody(updateEquipment, { requireAny: true }), async (req, res) => {
  const id = parseId(req.params.id);
  await getOr404(id);
  if (req.body.serialNumber !== undefined) await assertSerialFree(req.body.serialNumber, id);
  if (req.body.siteId !== undefined) await requireSite(req.body.siteId);
  await repo().update(id, req.body);
  res.json(await getOr404(id));
});

router.delete('/:id', async (req, res) => {
  const result = await repo().delete(parseId(req.params.id));
  if (!result.affected) throw HttpError.notFound('Equipment', req.params.id);
  res.status(204).send();
});

module.exports = router;
module.exports.listEquipment = listEquipment;
module.exports.createEquipment = createEquipment;
