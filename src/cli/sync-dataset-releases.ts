import '../config/load-env';
import { getConfig as getDatasetsConfig } from '../config/datasets/datasets.config';
import { GitHubReleaseSyncService } from '../datasets/sync/github-release-sync.service';

async function main() {
  const datasetsConfig = getDatasetsConfig();

  if (datasetsConfig.releaseSources.length === 0) {
    console.log('No dataset release sources configured.');
    console.log('Set DATASETS_RELEASE_SOURCES="Open-Syria/data-geography@v0.1.0".');
    return;
  }

  const syncService = new GitHubReleaseSyncService({
    releasesDirectory: datasetsConfig.releasesDirectory,
    githubToken: datasetsConfig.githubToken,
    downloadArtifacts: datasetsConfig.syncDownloadArtifacts,
  });
  const results = await syncService.syncSources(datasetsConfig.releaseSources);

  for (const result of results) {
    console.log(
      `Synced ${result.source}: manifest=${result.manifestPath}, artifacts=${result.artifactsDownloaded}, skipped=${result.artifactsSkipped}`,
    );
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
