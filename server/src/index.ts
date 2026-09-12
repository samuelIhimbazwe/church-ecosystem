import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Kacyiru API listening on :${config.port}`);
  console.log(`CORS origin: ${JSON.stringify(config.corsOrigin)}`);
});
