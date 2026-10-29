try {
  process.loadEnvFile();
} catch {
  // .env необов'язковий: є значення за замовчуванням
}

const env = process.env;
const dbName = env.DB_NAME ?? 'blog_api';

export const config = {
  port: Number(env.PORT ?? 3000),
  db: {
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    name: dbName,
    testName: env.DB_NAME_TEST ?? `${dbName}_test`,
  },
};
