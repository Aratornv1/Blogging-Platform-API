try {
  process.loadEnvFile();
} catch {
  // .env необов'язковий: є значення за замовчуванням
}

const env = process.env;
const dbName = env.DB_NAME ?? 'blog_api';

// Number('abc') дає NaN, і сервер мовчки стартував би на неправильному порту
function toPort(name: string, fallback: number): number {
  const port = Number(env[name] ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a port number from 1 to 65535, got "${env[name]}"`);
  }
  return port;
}

export const config = {
  port: toPort('PORT', 3000),
  db: {
    host: env.DB_HOST ?? 'localhost',
    port: toPort('DB_PORT', 3306),
    user: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    name: dbName,
    testName: env.DB_NAME_TEST ?? `${dbName}_test`,
  },
};
