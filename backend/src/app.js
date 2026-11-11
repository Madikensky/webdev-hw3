const express = require('express');
const { AppDataSource } = require('./data-source');
const apiRouter = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (req, res) => {
    let database = 'up';
    try {
      await AppDataSource.query('SELECT 1');
    } catch (err) {
      database = 'down';
    }
    res
      .status(database === 'up' ? 200 : 503)
      .json({ status: database === 'up' ? 'ok' : 'degraded', database });
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
