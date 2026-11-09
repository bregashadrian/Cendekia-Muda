export function readConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV harus development, test, atau production.');
  }

  const rawPort = env.PORT ?? '3000';
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT harus bilangan bulat antara 1 dan 65535.');
  }

  const host = env.HOST || '127.0.0.1';
  if (!/^[a-zA-Z0-9.:-]+$/.test(host)) {
    throw new Error('HOST harus berupa hostname atau alamat IP tanpa protokol/port.');
  }
  return { nodeEnv, host, port };
}
