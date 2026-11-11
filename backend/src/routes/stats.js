const express = require('express');
const { AppDataSource } = require('../data-source');
const { SITE_STATUSES, EQUIPMENT_STATUSES, EQUIPMENT_TYPES, INSPECTION_RESULTS } = require('../constants');

const router = express.Router();

const countsBy = (rows, keys) =>
  Object.fromEntries(keys.map((k) => [k, Number(rows.find((r) => r.key === k)?.count || 0)]));

router.get('/overview', async (req, res) => {
  const q = (sql) => AppDataSource.query(sql);

  const [sitesByStatus, equipmentByStatus, equipmentByType, recentInspections, sitesByCity, attention] =
    await Promise.all([
      q(`SELECT status AS key, COUNT(*) AS count FROM sites GROUP BY status`),
      q(`SELECT status AS key, COUNT(*) AS count FROM equipment GROUP BY status`),
      q(`SELECT type AS key, COUNT(*) AS count FROM equipment GROUP BY type`),
      q(`SELECT result AS key, COUNT(*) AS count FROM inspections
          WHERE inspected_at >= CURRENT_DATE - 30 GROUP BY result`),
      q(`SELECT c.id AS "cityId", c.name AS city, COUNT(s.id) AS count
           FROM cities c LEFT JOIN sites s ON s.city_id = c.id
          GROUP BY c.id ORDER BY count DESC, c.name ASC`),

      q(`SELECT COUNT(*) AS count FROM sites s
          WHERE s.status = 'active' AND (
            EXISTS (SELECT 1 FROM equipment e WHERE e.site_id = s.id AND e.status = 'faulty')
            OR (SELECT i.result FROM inspections i WHERE i.site_id = s.id
                 ORDER BY i.inspected_at DESC, i.id DESC LIMIT 1) IN ('failed', 'needs_attention'))`),
    ]);

  const siteCounts = countsBy(sitesByStatus, SITE_STATUSES);
  const equipmentCounts = countsBy(equipmentByStatus, EQUIPMENT_STATUSES);

  res.json({
    sites: {
      total: Object.values(siteCounts).reduce((a, b) => a + b, 0),
      byStatus: siteCounts,
      needingAttention: Number(attention[0].count),
    },
    equipment: {
      total: Object.values(equipmentCounts).reduce((a, b) => a + b, 0),
      byStatus: equipmentCounts,
      byType: countsBy(equipmentByType, EQUIPMENT_TYPES),
    },
    inspectionsLast30Days: countsBy(recentInspections, INSPECTION_RESULTS),
    sitesByCity: sitesByCity.map((r) => ({ cityId: r.cityId, city: r.city, siteCount: Number(r.count) })),
  });
});

module.exports = router;
