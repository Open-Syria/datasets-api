const { spawnSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const semverPattern =
  /^(?:v)?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const readinessLevels = new Set([
  'raw_seed',
  'identity_seed_ready',
  'public_directory_ready',
  'profile_ready',
]);
const publicApiReadinessStatuses = new Set(['not_approved', 'approved']);
const booleanOptions = new Set([
  'docker-build',
  'help',
  'require-all-dataset-sources',
  'skip-build',
]);

function usage() {
  return `
Usage:
  pnpm run release:check
  pnpm run release:check -- --version v0.0.1 --geography-release v0.1.0

Options:
  --version <version>             Expected API package/OpenAPI version.
  --geography-release <tag>       Expected data-geography tag in docs and examples.
  --dataset-sources <sources>     Comma-separated owner/repo@tag sources to validate.
  --require-all-dataset-sources   Require --dataset-sources to cover every pinned dataset.
  --skip-build                    Do not run pnpm run build before checking dist files.
  --docker-build                  Also run docker build. Requires a running Docker daemon.
`.trim();
}

function parseArgs(argv) {
  const options = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const equalsIndex = arg.indexOf('=');
    const name = arg.slice(2, equalsIndex === -1 ? undefined : equalsIndex);

    if (booleanOptions.has(name)) {
      if (equalsIndex !== -1) {
        options.set(name, arg.slice(equalsIndex + 1) !== 'false');
      } else {
        options.set(name, true);
      }
      continue;
    }

    const inlineValue = equalsIndex === -1 ? undefined : arg.slice(equalsIndex + 1);
    const nextValue = inlineValue ?? argv[index + 1];

    if (!nextValue || nextValue.startsWith('--')) {
      throw new Error(`--${name} requires a value`);
    }

    if (inlineValue === undefined) {
      index += 1;
    }

    options.set(name, nextValue);
  }

  return options;
}

function fail(message) {
  throw new Error(message);
}

function normalizePackageVersion(value) {
  if (!value || !semverPattern.test(value)) {
    fail(`Expected a SemVer version such as 0.0.1 or v0.0.1: ${value}`);
  }

  return value.startsWith('v') ? value.slice(1) : value;
}

function normalizeReleaseTag(value) {
  if (!value || !semverPattern.test(value)) {
    fail(`Expected a SemVer tag such as v0.1.0: ${value}`);
  }

  return value.startsWith('v') ? value : `v${value}`;
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assertExists(relativePath) {
  const filePath = path.join(root, relativePath);

  if (!existsSync(filePath)) {
    fail(`Missing required release file: ${relativePath}`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    shell: options.shell ?? false,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runPnpm(args) {
  if (process.platform === 'win32') {
    run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'pnpm', ...args]);
    return;
  }

  run('pnpm', args);
}

function assertSwaggerVersion(expectedVersion) {
  const swaggerSetup = readText('src/tools/swagger/swagger.setup.ts');
  const versionMatch = swaggerSetup.match(/\.setVersion\('([^']+)'\)/);

  if (!versionMatch) {
    fail('Could not find OpenAPI .setVersion(...) in swagger.setup.ts');
  }

  if (versionMatch[1] !== expectedVersion) {
    fail(`OpenAPI version is ${versionMatch[1]}, expected ${expectedVersion}`);
  }
}

function parseDatasetSource(value) {
  const match = value.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)@(v.+)$/);

  if (!match) {
    fail(`Dataset release source must look like Open-Syria/data-geography@v0.1.0: ${value}`);
  }

  return {
    owner: match[1],
    repository: match[2],
    tag: normalizeReleaseTag(match[3]),
    value,
  };
}

function parseDatasetSources(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean)
    .map(parseDatasetSource);
}

function readDatasetReleaseLockSources() {
  const config = readJson('dataset-releases.json');

  if (!Array.isArray(config.sources)) {
    fail('dataset-releases.json must include a sources array');
  }

  return config.sources.map((source) => {
    if (
      !source ||
      typeof source.owner !== 'string' ||
      typeof source.repository !== 'string' ||
      typeof source.tag !== 'string'
    ) {
      fail('dataset-releases.json sources must include owner, repository, and tag strings');
    }

    const requiredReadiness = source.requiredReadiness;

    if (requiredReadiness !== undefined) {
      if (!requiredReadiness || typeof requiredReadiness !== 'object') {
        fail('dataset-releases.json requiredReadiness must be an object');
      }

      if (
        requiredReadiness.minimumLevel !== undefined &&
        !readinessLevels.has(requiredReadiness.minimumLevel)
      ) {
        fail(`Unsupported requiredReadiness.minimumLevel: ${requiredReadiness.minimumLevel}`);
      }

      if (
        requiredReadiness.publicApi !== undefined &&
        !publicApiReadinessStatuses.has(requiredReadiness.publicApi)
      ) {
        fail(`Unsupported requiredReadiness.publicApi: ${requiredReadiness.publicApi}`);
      }
    }

    return {
      owner: source.owner,
      repository: source.repository,
      tag: normalizeReleaseTag(source.tag),
      requiredReadiness,
      value: `${source.owner}/${source.repository}@${normalizeReleaseTag(source.tag)}`,
    };
  });
}

function assertFilesContain(files, expectedText) {
  for (const file of files) {
    const text = readText(file);

    if (!text.includes(expectedText)) {
      fail(`${file} must mention ${expectedText}`);
    }
  }
}

function findDatasetSource(sources, owner, repository) {
  return sources.find((source) => source.owner === owner && source.repository === repository);
}

function assertDatasetSourcesMatchReleaseLock(
  datasetSources,
  releaseLockSources,
  requireAllDatasetSources,
) {
  if (datasetSources.length === 0) {
    return;
  }

  const configuredKeys = new Set();

  for (const datasetSource of datasetSources) {
    const key = `${datasetSource.owner}/${datasetSource.repository}`;

    if (configuredKeys.has(key)) {
      fail(`Configured dataset sources include ${key} more than once`);
    }

    configuredKeys.add(key);

    const lockSource = findDatasetSource(
      releaseLockSources,
      datasetSource.owner,
      datasetSource.repository,
    );

    if (!lockSource) {
      fail(`${datasetSource.value} is not pinned in dataset-releases.json`);
    }

    if (lockSource.tag !== datasetSource.tag) {
      fail(`dataset-releases.json pins ${lockSource.value}, expected ${datasetSource.value}`);
    }
  }

  if (!requireAllDatasetSources) {
    return;
  }

  for (const lockSource of releaseLockSources) {
    const datasetSource = findDatasetSource(
      datasetSources,
      lockSource.owner,
      lockSource.repository,
    );

    if (!datasetSource) {
      fail(`Configured dataset sources must include ${lockSource.value}`);
    }
  }
}

function assertDatasetReleaseGates(releaseLockSources) {
  for (const lockSource of releaseLockSources) {
    if (lockSource.repository === 'data-geography') {
      continue;
    }

    if (!lockSource.requiredReadiness) {
      fail(`${lockSource.value} must declare requiredReadiness in dataset-releases.json`);
    }

    if (!lockSource.requiredReadiness.minimumLevel) {
      fail(`${lockSource.value} requiredReadiness must include minimumLevel`);
    }

    if (!lockSource.requiredReadiness.publicApi) {
      fail(`${lockSource.value} requiredReadiness must include publicApi`);
    }
  }
}

function assertGeographyReleaseReferences(geographyReleaseTag, datasetSources, releaseLockSources) {
  const expectedSource = `Open-Syria/data-geography@${geographyReleaseTag}`;

  assertFilesContain(
    ['docs/dataset-loading.md', 'src/datasets/sync/dataset-release-source.utils.spec.ts'],
    expectedSource,
  );
  assertFilesContain(
    ['.github/workflows/deploy-production.yml'],
    `GEOGRAPHY_RELEASE: ${geographyReleaseTag}`,
  );

  const lockSource = findDatasetSource(releaseLockSources, 'Open-Syria', 'data-geography');

  if (!lockSource) {
    fail(`dataset-releases.json must include ${expectedSource}`);
  }

  if (lockSource.tag !== geographyReleaseTag) {
    fail(
      `dataset-releases.json pins Open-Syria/data-geography@${lockSource.tag}, expected ${geographyReleaseTag}`,
    );
  }

  if (
    datasetSources.length > 0 &&
    !datasetSources.some(
      (source) => source.owner === 'Open-Syria' && source.repository === 'data-geography',
    )
  ) {
    fail(`Configured dataset sources must include ${expectedSource}`);
  }

  const geographySource = findDatasetSource(datasetSources, 'Open-Syria', 'data-geography');

  if (geographySource && geographySource.tag !== geographyReleaseTag) {
    fail(`Configured geography release is ${geographySource.tag}, expected ${geographyReleaseTag}`);
  }
}

function assertDockerfileReadiness() {
  const dockerfile = readText('Dockerfile');
  const requiredFragments = [
    'FROM node:24',
    'RUN pnpm run build',
    'COPY --from=build /app/dist ./dist',
    'COPY dataset-releases.json ./',
    'CMD ["node", "dist/main.js"]',
  ];

  for (const fragment of requiredFragments) {
    if (!dockerfile.includes(fragment)) {
      fail(`Dockerfile must include: ${fragment}`);
    }
  }
}

function assertProductionScripts(packageJson) {
  const requiredScripts = [
    'build',
    'start:prod',
    'datasets:sync:prod',
    'read-model:import:geography:prod',
    'read-model:refresh:geography:prod',
  ];

  for (const script of requiredScripts) {
    if (!packageJson.scripts?.[script]) {
      fail(`package.json is missing script: ${script}`);
    }
  }
}

function assertDistRuntimeFiles() {
  for (const relativePath of [
    'dist/main.js',
    'dist/generated/prisma/client.js',
    'dist/i18n/messages/en/api.json',
    'dist/i18n/messages/ar/api.json',
    'dist/cli/sync-dataset-releases.js',
    'dist/cli/import-geography-read-model.js',
  ]) {
    assertExists(relativePath);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.get('help')) {
    console.log(usage());
    return;
  }

  const packageJson = readJson('package.json');
  const expectedVersion = normalizePackageVersion(options.get('version') ?? packageJson.version);

  if (packageJson.version !== expectedVersion) {
    fail(`package.json version is ${packageJson.version}, expected ${expectedVersion}`);
  }

  if (packageJson.version === '0.0.0') {
    fail('Refusing to release API version 0.0.0');
  }

  assertSwaggerVersion(expectedVersion);
  assertProductionScripts(packageJson);
  assertDockerfileReadiness();
  const releaseLockSources = readDatasetReleaseLockSources();

  const datasetSources = parseDatasetSources(
    options.get('dataset-sources') ?? process.env.DATASETS_RELEASE_SOURCES,
  );
  const requireAllDatasetSources = Boolean(options.get('require-all-dataset-sources'));

  assertDatasetSourcesMatchReleaseLock(
    datasetSources,
    releaseLockSources,
    requireAllDatasetSources,
  );
  assertDatasetReleaseGates(releaseLockSources);

  const configuredGeographySource = findDatasetSource(
    datasetSources,
    'Open-Syria',
    'data-geography',
  );
  const geographyReleaseTag = options.get('geography-release')
    ? normalizeReleaseTag(options.get('geography-release'))
    : configuredGeographySource?.tag;

  if (geographyReleaseTag) {
    assertGeographyReleaseReferences(geographyReleaseTag, datasetSources, releaseLockSources);
  }

  if (!options.get('skip-build')) {
    runPnpm(['run', 'build']);
  }

  assertDistRuntimeFiles();

  if (options.get('docker-build')) {
    run('docker', ['build', '-t', 'opensyria/datasets-api:release-check', '.']);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        version: packageJson.version,
        geographyRelease: geographyReleaseTag ?? null,
        datasetSources: datasetSources.map((source) => source.value),
        requireAllDatasetSources,
        dockerBuild: Boolean(options.get('docker-build')),
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
