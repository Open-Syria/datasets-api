import {
  formatDatasetReleaseSource,
  parseDatasetReleaseSource,
  parseDatasetReleaseSources,
  parseDatasetReleaseSourcesConfig,
} from './dataset-release-source.utils';

describe('dataset release source utils', () => {
  it('parses a pinned GitHub release source', () => {
    expect(parseDatasetReleaseSource('Open-Syria/data-geography@v0.1.4')).toEqual({
      owner: 'Open-Syria',
      repository: 'data-geography',
      tag: 'v0.1.4',
    });
  });

  it('parses comma-separated sources', () => {
    expect(
      parseDatasetReleaseSources(
        'Open-Syria/data-geography@v0.1.4, Open-Syria/data-universities@v0.2.2',
      ),
    ).toHaveLength(2);
  });

  it('formats a source for logs and errors', () => {
    expect(
      formatDatasetReleaseSource({
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.4',
      }),
    ).toBe('Open-Syria/data-geography@v0.1.4');
  });

  it('parses the tracked release source config', () => {
    expect(
      parseDatasetReleaseSourcesConfig({
        sources: [
          {
            owner: 'Open-Syria',
            repository: 'data-geography',
            tag: 'v0.1.4',
          },
          {
            owner: 'Open-Syria',
            repository: 'data-universities',
            tag: 'v0.2.2',
            requiredReadiness: {
              minimumLevel: 'profile_ready',
              publicApi: 'approved',
            },
          },
        ],
      }),
    ).toEqual([
      {
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.4',
      },
      {
        owner: 'Open-Syria',
        repository: 'data-universities',
        tag: 'v0.2.2',
        requiredReadiness: {
          minimumLevel: 'profile_ready',
          publicApi: 'approved',
        },
      },
    ]);
  });
});
