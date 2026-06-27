import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

const PROJECT_ROOT_MARKERS = ['pnpm-workspace.yaml', 'package.json'];
const loadedEnvFiles = new Set<string>();

function getNormalizedEnvName() {
  const requestedEnv = process.env.APP_ENV ?? process.env.NODE_ENV;

  switch (requestedEnv) {
    case 'local':
    case 'staging':
    case 'production':
    case 'test':
      return requestedEnv;
    default:
      return 'development';
  }
}

function findProjectRoot(startDir: string) {
  let currentDir = path.resolve(startDir);

  while (true) {
    if (PROJECT_ROOT_MARKERS.some((marker) => existsSync(path.join(currentDir, marker)))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      return path.resolve(startDir);
    }

    currentDir = parentDir;
  }
}

function getEnvFilesForDirectory(baseDir: string, envName: string) {
  return [
    path.join(baseDir, `.env.${envName}.local`),
    path.join(baseDir, `.env.${envName}`),
    path.join(baseDir, '.env.local'),
    path.join(baseDir, '.env'),
  ];
}

function loadEnv() {
  const projectRoot = findProjectRoot(process.cwd());
  const envName = getNormalizedEnvName();
  const envFiles = getEnvFilesForDirectory(projectRoot, envName);

  for (const envFile of envFiles) {
    if (!existsSync(envFile) || loadedEnvFiles.has(envFile)) {
      continue;
    }

    config({ path: envFile, override: false, quiet: true });
    loadedEnvFiles.add(envFile);
  }
}

loadEnv();
