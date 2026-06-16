const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../backups');
const DATABASE_URL = process.env.DATABASE_URL;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `postgres-backup-${timestamp}.sql`);

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required to create a PostgreSQL backup.');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

try {
  execFileSync('pg_dump', [DATABASE_URL, '--file', backupPath, '--format=plain', '--no-owner'], {
    stdio: 'inherit'
  });
  console.log(`PostgreSQL backup created: ${path.basename(backupPath)}`);

  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('postgres-backup-') && file.endsWith('.sql'))
    .sort()
    .reverse();

  for (const oldBackup of backups.slice(7)) {
    fs.unlinkSync(path.join(BACKUP_DIR, oldBackup));
    console.log(`Deleted old backup: ${oldBackup}`);
  }
} catch (error) {
  console.error('PostgreSQL backup failed. Make sure pg_dump is installed and DATABASE_URL is valid.');
  process.exit(error.status || 1);
}
