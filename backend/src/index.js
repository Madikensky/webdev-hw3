const { AppDataSource } = require('./data-source');
const { createApp } = require('./app');
const { seedIfEmpty } = require('./seed');

const PORT = process.env.PORT || 3000;

async function main() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  if (process.env.SEED_ON_START === 'true') {
    await seedIfEmpty();
  }

  const server = createApp().listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await AppDataSource.destroy();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
