import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in .env');
  process.exit(1);
}

const backupDir = path.join(__dirname, '../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}`);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

console.log(`🔄 Starting backup...`);
console.log(`   Target: ${backupFile}`);

const command = `pg_dump "${DATABASE_URL}" > "${backupFile}"`;

exec(command, (error, _stdout, stderr) => {
  if (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    // Remove empty/partial file if it was created
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }
    process.exit(1);
  }
  if (stderr) {
    console.warn(`⚠️  Backup warning: ${stderr}`);
  }

  const stats = fs.statSync(backupFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`✅ Backup successful!`);
  console.log(`   File: ${path.basename(backupFile)}`);
  console.log(`   Size: ${sizeMB} MB`);

  // List existing backups and auto-cleanup: keep latest 10
  const allBackups = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.sql'))
    .sort();

  console.log(`\n📋 Total backups stored: ${allBackups.length}`);

  if (allBackups.length > 10) {
    const toDelete = allBackups.slice(0, allBackups.length - 10);
    toDelete.forEach((f) => {
      fs.unlinkSync(path.join(backupDir, f));
      console.log(`🗑️  Removed old backup: ${f}`);
    });
  }
});
