const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const datasetContracts = {
  'data-geography': {
    datasetId: 'opensyria-geography',
    collectionPath: '/api/v1/geography/governorates?limit=ten',
    openApiPath: '/openapi/geography.json',
  },
  'data-universities': {
    datasetId: 'opensyria-universities',
    collectionPath: '/api/v1/universities?limit=ten',
    openApiPath: '/openapi/universities.json',
  },
  'data-transport': {
    datasetId: 'opensyria-transport',
    collectionPath: '/api/v1/transport/locations?limit=ten',
    openApiPath: '/openapi/transport.json',
  },
  'data-telecom': {
    datasetId: 'opensyria-telecom',
    collectionPath: '/api/v1/telecom/operators?limit=ten',
    openApiPath: '/openapi/telecom.json',
  },
};

function parseArgs(argv) {
  const options = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument.startsWith('--')) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const name = argument.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires a value`);
    }

    options.set(name, value);
    index += 1;
  }

  return options;
}

function readReleaseSources() {
  const config = JSON.parse(readFileSync(path.join(root, 'dataset-releases.json'), 'utf8'));

  if (!Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error('dataset-releases.json must contain release sources');
  }

  return config.sources;
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function fetchJson(baseUrl, requestPath) {
  const response = await fetch(new URL(requestPath, baseUrl), {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`${requestPath} returned HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function checkProduction(baseUrl, sources) {
  const health = await fetchJson(baseUrl, '/health/ready');
  const releaseHealth = health.data?.datasetReleases;

  if (
    releaseHealth?.status !== 'loaded' ||
    releaseHealth.count !== sources.length ||
    releaseHealth.expectedCount !== sources.length ||
    releaseHealth.missing?.length !== 0
  ) {
    throw new Error(`unexpected dataset release health: ${JSON.stringify(releaseHealth)}`);
  }

  const discovery = await fetchJson(baseUrl, '/api/v1/datasets?limit=fifty');
  const datasets = discovery.data?.items;

  if (!Array.isArray(datasets)) {
    throw new Error('dataset discovery response does not contain data.items');
  }

  for (const source of sources) {
    const contract = datasetContracts[source.repository];

    if (!contract) {
      throw new Error(`No production check contract for ${source.repository}`);
    }

    const dataset = datasets.find((item) => item.id === contract.datasetId);

    if (
      !dataset ||
      dataset.repository !== source.repository ||
      dataset.version !== source.tag ||
      dataset.status !== 'released' ||
      dataset.apiEndpoints.length === 0
    ) {
      throw new Error(
        `${source.repository} discovery does not expose released version ${source.tag}`,
      );
    }

    const collection = await fetchJson(baseUrl, contract.collectionPath);

    if (
      collection.data?.dataset?.id !== contract.datasetId ||
      collection.data?.dataset?.repository !== source.repository ||
      collection.data?.release?.version !== source.tag ||
      collection.data?.pagination?.totalRecords <= 0
    ) {
      throw new Error(`${contract.collectionPath} returned unexpected release data`);
    }

    const openApi = await fetchJson(baseUrl, contract.openApiPath);

    if (!openApi.paths || Object.keys(openApi.paths).length === 0) {
      throw new Error(`${contract.openApiPath} does not contain paths`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseUrl = options.get('base-url') ?? 'https://api.opensyria.org';
  const attempts = Number(options.get('attempts') ?? 12);
  const delayMs = Number(options.get('delay-ms') ?? 5_000);
  const sources = readReleaseSources();
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await checkProduction(baseUrl, sources);
      console.log(
        `Verified ${sources.length} pinned dataset releases on ${baseUrl} after ${attempt} attempt(s).`,
      );
      return;
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        console.warn(
          `Production check ${attempt}/${attempts} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
