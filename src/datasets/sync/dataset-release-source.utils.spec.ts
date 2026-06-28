import {
  formatDatasetReleaseSource,
  parseDatasetReleaseSource,
  parseDatasetReleaseSources,
} from './dataset-release-source.utils';

describe('dataset release source utils', () => {
  it('parses a pinned GitHub release source', () => {
    expect(parseDatasetReleaseSource('Open-Syria/data-geography@v0.1.1')).toEqual({
      owner: 'Open-Syria',
      repository: 'data-geography',
      tag: 'v0.1.1',
    });
  });

  it('parses comma-separated sources', () => {
    expect(
      parseDatasetReleaseSources(
        'Open-Syria/data-geography@v0.1.1, Open-Syria/data-universities@v0.1.0',
      ),
    ).toHaveLength(2);
  });

  it('formats a source for logs and errors', () => {
    expect(
      formatDatasetReleaseSource({
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.1',
      }),
    ).toBe('Open-Syria/data-geography@v0.1.1');
  });
});
