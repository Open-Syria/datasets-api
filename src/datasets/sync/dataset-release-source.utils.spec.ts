import {
  formatDatasetReleaseSource,
  parseDatasetReleaseSource,
  parseDatasetReleaseSources,
  parseDatasetReleaseSourcesConfig,
} from './dataset-release-source.utils';

describe('dataset release source utils', () => {
  it('parses a pinned GitHub release source', () => {
    expect(parseDatasetReleaseSource('Open-Syria/data-geography@v0.1.5')).toEqual({
      owner: 'Open-Syria',
      repository: 'data-geography',
      tag: 'v0.1.5',
    });
  });

  it('parses comma-separated sources', () => {
    expect(
      parseDatasetReleaseSources(
        'Open-Syria/data-geography@v0.1.5, Open-Syria/data-universities@v0.2.2',
      ),
    ).toHaveLength(2);
  });

  it('formats a source for logs and errors', () => {
    expect(
      formatDatasetReleaseSource({
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.5',
      }),
    ).toBe('Open-Syria/data-geography@v0.1.5');
  });

  it('parses the tracked release source config', () => {
    expect(
      parseDatasetReleaseSourcesConfig({
        sources: [
          {
            owner: 'Open-Syria',
            repository: 'data-geography',
            tag: 'v0.1.5',
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
          {
            owner: 'Open-Syria',
            repository: 'data-telecom',
            tag: 'v0.1.0',
            requiredReadiness: {
              minimumLevel: 'api_ready',
              publicApi: 'approved',
            },
          },
        ],
      }),
    ).toEqual([
      {
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.5',
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
      {
        owner: 'Open-Syria',
        repository: 'data-telecom',
        tag: 'v0.1.0',
        requiredReadiness: {
          minimumLevel: 'api_ready',
          publicApi: 'approved',
        },
      },
    ]);
  });
});
