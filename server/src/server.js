import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { readConfig } from './config.js';

try {
  try {
    loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const config = readConfig();
  const server = createApp().listen(config.port, config.host);
  server.once('listening', () => {
    const browserHost = config.host === '0.0.0.0' || config.host === '::' ? 'localhost' : config.host.includes(':') ? `[${config.host}]` : config.host;
    const base = `http://${browserHost}:${config.port}`;
    console.log(`Cendekia Muda — Node.js + Express (${config.nodeEnv})`);
    console.log(`Website: ${base}`);
    console.log(`API:     ${base}/api/health`);
    console.log('Tahap fondasi: data frontend masih tersimpan di browser.');
  });
  server.once('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${config.port} sedang digunakan. Atur PORT lain di .env.` : `Server gagal berjalan (${error.code || 'UNKNOWN'}). Periksa HOST dan PORT.`);
    process.exitCode = 1;
  });

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => {
      console.error('Batas waktu penghentian server tercapai.');
      process.exit(1);
    }, 5000).unref();
    server.close(error => {
      clearTimeout(timeout);
      if (error) console.error('Server belum dapat ditutup dengan bersih.');
      process.exitCode = error ? 1 : 0;
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  console.error(`Konfigurasi server gagal: ${error.message}`);
  process.exitCode = 1;
}
