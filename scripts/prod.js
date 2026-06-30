import { existsSync, readFileSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

console.log('Starting Acquisition App in Production Mode');
console.log('============================================');

if (!existsSync('.env.production')) {
  console.error('Error: .env.production file not found!');
  console.error(
    '   Please create it with your production environment variables.'
  );
  process.exit(1);
}

const envContent = readFileSync('.env.production', 'utf8');
if (
  envContent.includes('<user>') ||
  envContent.includes('<password>') ||
  envContent.includes('<endpoint>')
) {
  console.error('Error: .env.production still has placeholder values!');
  console.error(
    '   Please fill in the real Neon Cloud credentials before deploying.'
  );
  process.exit(1);
}

try {
  execSync('docker info', { stdio: 'ignore' });
} catch {
  console.error('Error: Docker is not running!');
  console.error('   Please start Docker and try again.');
  process.exit(1);
}

console.log('Building and starting production container...');
console.log('   - Using Neon Cloud Database (no local proxy)');
console.log('   - Migrations run automatically on container startup');
console.log('   - Running in optimized production mode');
console.log('');

const proc = spawn(
  'docker',
  ['compose', '-f', 'docker-compose.prod.yml', 'up', '--build', '-d'],
  {
    stdio: 'inherit',
    shell: true,
  }
);

proc.on('close', code => {
  if (code !== 0) {
    console.error(`\nError: docker compose exited with code ${code}`);
    process.exit(code ?? 1);
  }

  console.log('');
  console.log('Production environment started!');
  console.log('   Application: http://localhost:3000');
  console.log('');
  console.log('Useful commands:');
  console.log('   View logs:  docker logs -f aquisitions-api-app-1');
  console.log('   Stop app:   docker compose -f docker-compose.prod.yml down');
});
