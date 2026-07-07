import app from './app';
import { config } from './config/config';
import { verifySupabaseConnection } from './config/supabase';

async function bootstrap(): Promise<void> {
  try {
    await verifySupabaseConnection();
    console.log('Supabase connection verified');

    app.listen(config.port, () => {
      console.log(`KUPC Server is running in ${config.env} mode on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Failed to start KUPC server');
    process.exit(1);
  }
}

void bootstrap();
