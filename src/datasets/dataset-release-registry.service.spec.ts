import type { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../config/config.type';
import type { DatasetReleaseManifest } from './contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from './dataset-release-registry.service';
import type { LoadedDatasetReleaseManifest } from './loaders/dataset-manifest-loader.interface';
import type { LocalDatasetManifestLoader } from './loaders/local-dataset-manifest-loader.service';

type ConfigServiceMock = Pick<ConfigService<GlobalConfig>, 'getOrThrow'>;
type LocalDatasetManifestLoaderMock = Pick<LocalDatasetManifestLoader, 'listManifests'>;

function createManifest({
  category = 'geography',
  generatedAt = '2026-06-28T00:00:00.000Z',
  id = 'opensyria-geography',
  publishedAt = null,
  slug = 'geography',
  version,
}: {
  category?: DatasetReleaseManifest['dataset']['category'];
  generatedAt?: string;
  id?: string;
  publishedAt?: string | null;
  slug?: string;
  version: string;
}): DatasetReleaseManifest {
  return {
    schemaVersion: '1.0',
    generatedAt,
    dataset: {
      id,
      slug,
      repository: `data-${slug}`,
      category,
      title: {
        en: slug,
      },
    },
    release: {
      version,
      status: 'released',
      publishedAt,
      notes: null,
    },
    artifacts: [],
    sources: [],
  };
}

function createRegistration(manifest: DatasetReleaseManifest): LoadedDatasetReleaseManifest {
  return {
    manifest,
    manifestPath: `${manifest.dataset.slug}/${manifest.release.version}/release-manifest.json`,
    releaseDirectory: `${manifest.dataset.slug}/${manifest.release.version}`,
  };
}

function createService(registrations: LoadedDatasetReleaseManifest[]) {
  const configService: ConfigServiceMock = {
    getOrThrow: jest.fn(() => ({
      requireReleases: false,
    })),
  };
  const localDatasetManifestLoader: LocalDatasetManifestLoaderMock = {
    listManifests: jest.fn(() => Promise.resolve(registrations)),
  };

  return new DatasetReleaseRegistryService(
    configService as ConfigService<GlobalConfig>,
    localDatasetManifestLoader as LocalDatasetManifestLoader,
  );
}

describe('DatasetReleaseRegistryService', () => {
  it('keeps the newest manifest per dataset when multiple release versions are present', async () => {
    const service = createService([
      createRegistration(createManifest({ version: 'v0.1.0' })),
      createRegistration(createManifest({ version: 'v0.1.4' })),
      createRegistration(
        createManifest({
          category: 'education',
          id: 'opensyria-universities',
          slug: 'universities',
          version: 'v0.1.0',
        }),
      ),
    ]);

    await service.onModuleInit();

    const manifests = service.listManifests();

    expect(manifests).toHaveLength(2);
    expect(manifests.map((manifest) => manifest.dataset.id)).toEqual([
      'opensyria-geography',
      'opensyria-universities',
    ]);
    expect(service.getManifestByDatasetId('opensyria-geography')?.release.version).toBe('v0.1.4');
  });

  it('uses timestamps as a tie-breaker when versions match', async () => {
    const service = createService([
      createRegistration(
        createManifest({
          generatedAt: '2026-06-28T00:00:00.000Z',
          version: 'v0.1.4',
        }),
      ),
      createRegistration(
        createManifest({
          generatedAt: '2026-06-29T00:00:00.000Z',
          version: 'v0.1.4',
        }),
      ),
    ]);

    await service.onModuleInit();

    expect(service.getManifestByDatasetId('opensyria-geography')?.generatedAt).toBe(
      '2026-06-29T00:00:00.000Z',
    );
  });
});
