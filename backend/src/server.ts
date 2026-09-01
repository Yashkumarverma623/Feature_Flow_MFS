import app from './app';
import { config } from './config/env';
import { runMigrations } from './db/migrate';
import { initRedis } from './services/redis';

async function startServer() {
  try {
    console.log('[FeatureFlow Backend] Starting server...');
    
    // Attempt database migrations
    try {
      await runMigrations();
    } catch (migErr: any) {
      console.warn('[FeatureFlow Backend] Database migration step skipped or deferred:', migErr.message);
    }

    // Initialize Redis client
    await initRedis();

    app.listen(config.port, () => {
      console.log(`[FeatureFlow Backend] Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('[FeatureFlow Backend] Startup failed:', error);
    process.exit(1);
  }
}

startServer();
