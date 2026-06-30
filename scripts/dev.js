import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

console.log('Starting Acquisition App in Development Mode');
console.log('=============================================');

if (!existsSync('.env.development')) {
  console.error('Error: .env.development file not found!');
  console.error('   Please create it with your Neon credentials.');
  process.exit(1);
}

try {
  execSync('docker info', { stdio: 'ignore' });
} catch {
  console.error('Error: Docker is not running!');
  console.error('   Please start Docker Desktop and try again.');
  process.exit(1);
}

mkdirSync('.neon_local', { recursive: true });

const gitignorePath = '.gitignore';
const entry = '.neon_local/';
const gitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '';
if (!gitignore.includes(entry)) {
  appendFileSync(gitignorePath, `\n${entry}\n`);
  console.log('Added .neon_local/ to .gitignore');
}

console.log('Building and starting development containers...');
console.log('   - Neon Local proxy will create an ephemeral database branch');
console.log('   - Migrations run automatically on container startup');
console.log('   - Application will run with hot reload enabled');
console.log('');

const proc = spawn('docker', ['compose', '-f', 'docker-compose.dev.yml', 'up', '--build'], {
  stdio: 'inherit',
  shell: true,
});

proc.on('close', (code) => {
  console.log('');
  console.log('Development environment stopped.');
  console.log('   To clean up: docker compose -f docker-compose.dev.yml down');
  process.exit(code ?? 0);
});
