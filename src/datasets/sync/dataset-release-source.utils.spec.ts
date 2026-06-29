import {
  formatDatasetReleaseSource,
  parseDatasetReleaseSource,
  parseDatasetReleaseSources,
  parseDatasetReleaseSourcesConfig,
} from './dataset-release-source.utils';

describe('dataset release source utils', () => {
  it('parses a pinned GitHub release source', () => {
    expect(parseDatasetReleaseSource('Open-Syria/data-geography@v0.1.3')).toEqual({
      owner: 'Open-Syria',
      repository: 'data-geography',
      tag: 'v0.1.3',
    });
  });

  it('parses comma-separated sources', () => {
    expect(
      parseDatasetReleaseSources(
        'Open-Syria/data-geography@v0.1.3, Open-Syria/data-universities@v0.1.11',
      ),
    ).toHaveLength(2);
  });

  it('formats a source for logs and errors', () => {
    expect(
      formatDatasetReleaseSource({
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.3',
      }),
    ).toBe('Open-Syria/data-geography@v0.1.3');
  });

  it('parses the tracked release source config', () => {
    expect(
      parseDatasetReleaseSourcesConfig({
        sources: [
          {
            owner: 'Open-Syria',
            repository: 'data-geography',
            tag: 'v0.1.3',
          },
          {
            owner: 'Open-Syria',
            repository: 'data-universities',
            tag: 'v0.1.11',
          },
        ],
      }),
    ).toEqual([
      {
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.3',
      },
      {
        owner: 'Open-Syria',
        repository: 'data-universities',
        tag: 'v0.1.11',
      },
    ]);
  });
});
