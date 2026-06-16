require('dotenv').config();

function getPostgresConnection() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'bravehearts',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || undefined
  };
}

const postgresConfig = {
  client: 'pg',
  connection: getPostgresConnection(),
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './server/migrations'
  }
};

module.exports = {
  development: postgresConfig,
  production: postgresConfig,
  test: {
    ...postgresConfig,
    connection: process.env.TEST_DATABASE_URL || getPostgresConnection()
  }
};
