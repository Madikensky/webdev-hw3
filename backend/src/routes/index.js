const express = require('express');
const citiesRouter = require('./cities');
const sitesRouter = require('./sites');
const equipmentRouter = require('./equipment');
const inspectionsRouter = require('./inspections');
const statsRouter = require('./stats');

const router = express.Router();

router.use('/cities', citiesRouter);
router.use('/sites', sitesRouter);
router.use('/equipment', equipmentRouter);
router.use('/inspections', inspectionsRouter);
router.use('/stats', statsRouter);

module.exports = router;
