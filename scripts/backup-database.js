const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../backups');
const DB_PATH = process.env.DB_PATH || './data/database.sqlite';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `database-backup-${timestamp}.sqlite`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Database backup created: ${backupFileName}`);
    
    // Keep only last 7 backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('database-backup-') && file.endsWith('.sqlite'))
      .sort()
      .reverse();
    
    if (backups.length > 7) {
      const oldBackups = backups.slice(7);
      oldBackups.forEach(oldBackup => {
        fs.unlinkSync(path.join(BACKUP_DIR, oldBackup));
        console.log(`Deleted old backup: ${oldBackup}`);
      });
    }
  } else {
    console.log('Database file not found, skipping backup');
  }
}

// Run backup
createBackup();
