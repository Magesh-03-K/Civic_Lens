import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SECRET_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'AUTHORITY_PASSCODE',
  'SESSION_SECRET',
];

const secretsToScan: { key: string; value: string }[] = [];

for (const key of SECRET_KEYS) {
  const val = process.env[key];
  if (val && val.trim().length > 5) {
    secretsToScan.push({ key, value: val.trim() });
  }
}

console.log(`Scanning build directory .next/static for ${secretsToScan.length} secret keys...`);

const staticDir = path.resolve(process.cwd(), '.next/static');
let filesChecked = 0;
let leaksFound = 0;

function scanDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(js|json|html|txt)$/i.test(entry.name)) {
      filesChecked++;
      const content = fs.readFileSync(fullPath, 'utf8');

      for (const { key, value } of secretsToScan) {
        if (content.includes(value)) {
          console.error(`[LEAK DETECTED!] Secret ${key} found in ${fullPath}!`);
          leaksFound++;
        }
      }
    }
  }
}

scanDir(staticDir);

console.log(`Scanned ${filesChecked} files in .next/static.`);
if (leaksFound === 0) {
  console.log('✓ PASS: Zero server secrets found in client browser bundles!');
  process.exit(0);
} else {
  console.error(`✗ FAIL: Found ${leaksFound} leaked secrets in client bundles!`);
  process.exit(1);
}
