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
const arg = process.argv[2];

// If no argument given, list available backups and exit
if (!arg) {
  if (!fs.existsSync(backupDir)) {
    console.error('❌ No backups directory found. Run db:backup first.');
    process.exit(1);
  }
  const backups = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.sql'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.log('ℹ️  No backup files found.');
  } else {
    console.log(`\n📋 Available backups (${backups.length}):\n`);
    backups.forEach((f, i) => {
      const fullPath = path.join(backupDir, f);
      const stats = fs.statSync(fullPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`  [${i + 1}] ${f}  (${sizeMB} MB)`);
    });
    console.log(`\nUsage: npm run db:restore <backup-filename-or-path>`);
  }
  process.exit(0);
}

// Resolve the file path — accept either a filename or a full path
let backupFile = arg;
if (!path.isAbsolute(arg)) {
  // Check relative to backupDir first, then cwd
  const inBackupDir = path.join(backupDir, arg);
  backupFile = fs.existsSync(inBackupDir) ? inBackupDir : path.resolve(arg);
}

if (!fs.existsSync(backupFile)) {
  console.error(`❌ Backup file not found: ${backupFile}`);
  console.error(`   Run 'npm run db:restore' (no arguments) to list available backups.`);
  process.exit(1);
}

const stats = fs.statSync(backupFile);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`🔄 Starting restore...`);
console.log(`   Source: ${backupFile}`);
console.log(`   Size:   ${sizeMB} MB`);
console.log(`⚠️  WARNING: This will overwrite existing data!`);

const command = `psql "${DATABASE_URL}" < "${backupFile}"`;

exec(command, (error, _stdout, stderr) => {
  if (error) {
    console.error(`❌ Restore failed: ${error.message}`);
    process.exit(1);
  }
  if (stderr) {
    // psql often prints notices to stderr that are not actual errors
    console.warn(`⚠️  psql output: ${stderr}`);
  }
  console.log(`✅ Restore successful from: ${path.basename(backupFile)}`);
});
