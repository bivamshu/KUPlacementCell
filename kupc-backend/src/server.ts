import app from './app';
import { config } from './config/config';

app.listen(config.port, () => {
  console.log(`KUPC Server is running in ${config.env} mode on http://localhost:${config.port}`);
});
