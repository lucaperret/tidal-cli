import { getApiClient } from './auth';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { PlaybackInfo, PlaybackUrl } from './types';
export type { PlaybackInfo, PlaybackUrl };

type AudioQuality = 'LOW' | 'HIGH' | 'LOSSLESS' | 'HI_RES';

const qualityToFormats: Record<AudioQuality, string[]> = {
  LOW: ['HEAACV1'],
  HIGH: ['HEAACV1', 'AACLC'],
  LOSSLESS: ['HEAACV1', 'AACLC', 'FLAC'],
  HI_RES: ['HEAACV1', 'AACLC', 'FLAC', 'FLAC_HIRES'],
};

function formatsToQuality(formats: string[]): string {
  if (formats.includes('FLAC_HIRES')) return 'HI_RES_LOSSLESS';
  if (formats.includes('FLAC')) return 'LOSSLESS';
  if (formats.includes('AACLC')) return 'HIGH';
  return 'LOW';
}

interface TrackManifestResult {
  trackId: string;
  trackPresentation: string;
  previewReason?: string;
  formats: string[];
  audioQuality: string;
  manifestMimeType: string;
  manifest: string;
  trackReplayGain: number;
  trackPeakAmplitude: number;
  albumReplayGain: number;
  albumPeakAmplitude: number;
}

function parseDataUri(dataUri: string): { mimeType: string; data: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URI from trackManifests');
  return { mimeType: match[1], data: match[2] };
}

async function fetchTrackManifestData(trackId: string, quality: string, client: any): Promise<TrackManifestResult> {
  const formats = qualityToFormats[quality as AudioQuality] ?? qualityToFormats.HIGH;

  const { data, error } = await client.GET('/trackManifests/{id}', {
    params: {
      path: { id: trackId },
      query: {
        adaptive: false,
        formats: formats as any,
        manifestType: 'MPEG_DASH',
        uriScheme: 'DATA',
        usage: 'PLAYBACK',
      },
    },
  });

  if (error || !data) {
    throw new Error(`Failed to get track manifest — ${JSON.stringify(error)}`);
  }

  const attrs = (data as any).data?.attributes;
  if (!attrs?.uri) {
    throw new Error('No manifest URI in response.');
  }

  const { mimeType, data: manifestBase64 } = parseDataUri(attrs.uri);

  return {
    trackId: (data as any).data?.id ?? trackId,
    trackPresentation: attrs.trackPresentation ?? 'UNKNOWN',
    previewReason: attrs.previewReason,
    formats: attrs.formats ?? [],
    audioQuality: formatsToQuality(attrs.formats ?? []),
    manifestMimeType: mimeType,
    manifest: manifestBase64,
    trackReplayGain: attrs.trackAudioNormalizationData?.replayGain ?? 0,
    trackPeakAmplitude: attrs.trackAudioNormalizationData?.peakAmplitude ?? 0,
    albumReplayGain: attrs.albumAudioNormalizationData?.replayGain ?? 0,
    albumPeakAmplitude: attrs.albumAudioNormalizationData?.peakAmplitude ?? 0,
  };
}

// Keep backward-compatible internal helper
async function fetchTrackManifest(trackId: string, quality: string): Promise<TrackManifestResult> {
  const client = await getApiClient();
  return fetchTrackManifestData(trackId, quality, client);
}

interface DashSegments {
  initUrl: string;
  mediaTemplate: string;
  segments: number[];
}

interface StreamInfo {
  type: 'direct' | 'dash';
  url?: string;
  dash?: DashSegments;
  codecs?: string;
}

function decodeManifest(base64Manifest: string, mimeType: string): StreamInfo {
  const decoded = Buffer.from(base64Manifest, 'base64').toString('utf-8');

  // JSON manifest (BTS): has urls array
  if (mimeType.includes('tidal.bts') || mimeType.includes('json')) {
    try {
      const json = JSON.parse(decoded);
      if (json.urls?.length > 0) {
        return { type: 'direct', url: json.urls[0], codecs: json.codecs };
      }
    } catch {}
  }

  // DASH XML manifest
  if (mimeType.includes('dash') || decoded.includes('<MPD')) {
    const initMatch = decoded.match(/initialization="([^"]+)"/);
    const mediaMatch = decoded.match(/media="([^"]+)"/);
    const codecsMatch = decoded.match(/codecs="([^"]+)"/);

    const segmentDurations: number[] = [];
    const sMatches = decoded.matchAll(/<S d="(\d+)"(?:\s+r="(\d+)")?\/>/g);
    let segNum = 1;
    for (const m of sMatches) {
      const repeat = m[2] ? parseInt(m[2]) + 1 : 1;
      for (let i = 0; i < repeat; i++) {
        segmentDurations.push(segNum++);
      }
    }

    if (initMatch && mediaMatch && segmentDurations.length > 0) {
      return {
        type: 'dash',
        dash: {
          initUrl: initMatch[1],
          mediaTemplate: mediaMatch[1],
          segments: segmentDurations,
        },
        codecs: codecsMatch?.[1],
      };
    }

    const baseUrlMatch = decoded.match(/<BaseURL>([^<]+)<\/BaseURL>/);
    if (baseUrlMatch) {
      return { type: 'direct', url: baseUrlMatch[1], codecs: codecsMatch?.[1] };
    }
  }

  throw new Error('Unable to parse manifest');
}

async function downloadDashStream(dash: DashSegments): Promise<Buffer> {
  const initRes = await fetch(dash.initUrl);
  if (!initRes.ok) throw new Error(`Failed to download init segment (${initRes.status})`);
  const initBuf = Buffer.from(await initRes.arrayBuffer());

  const segBuffers: Buffer[] = [initBuf];
  for (const segNum of dash.segments) {
    const segUrl = dash.mediaTemplate.replace('$Number$', String(segNum));
    const segRes = await fetch(segUrl);
    if (!segRes.ok) throw new Error(`Failed to download segment ${segNum} (${segRes.status})`);
    segBuffers.push(Buffer.from(await segRes.arrayBuffer()));
  }

  return Buffer.concat(segBuffers);
}

export async function playbackInfoData(trackId: string, quality: string, client: any): Promise<PlaybackInfo> {
  const info = await fetchTrackManifestData(trackId, quality, client);

  return {
    trackId: info.trackId,
    presentation: info.trackPresentation,
    previewReason: info.previewReason,
    audioQuality: info.audioQuality,
    formats: info.formats,
    manifestMimeType: info.manifestMimeType,
    trackReplayGain: info.trackReplayGain,
    trackPeakAmplitude: info.trackPeakAmplitude,
    albumReplayGain: info.albumReplayGain,
    albumPeakAmplitude: info.albumPeakAmplitude,
  };
}

export async function playbackInfo(trackId: string, quality: string, json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await playbackInfoData(trackId, quality, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`\nPlayback info for track ${trackId}:\n`);
    console.log(`  Quality:        ${result.audioQuality}`);
    console.log(`  Formats:        ${result.formats?.join(', ')}`);
    console.log(`  Presentation:   ${result.presentation}`);
    if (result.previewReason) {
      console.log(`  Preview reason: ${result.previewReason}`);
    }
    console.log(`  Manifest type:  ${result.manifestMimeType}`);
    console.log(`  Track gain:     ${result.trackReplayGain} dB`);
    console.log(`  Album gain:     ${result.albumReplayGain} dB`);
    console.log();
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function playbackUrlData(trackId: string, quality: string, client: any): Promise<PlaybackUrl> {
  const info = await fetchTrackManifestData(trackId, quality, client);
  const stream = decodeManifest(info.manifest, info.manifestMimeType);

  if (stream.type === 'direct') {
    return { trackId: info.trackId, url: stream.url, audioQuality: info.audioQuality, type: 'direct' };
  } else if (stream.dash) {
    return {
      trackId: info.trackId,
      type: 'dash',
      initUrl: stream.dash.initUrl,
      segmentCount: stream.dash.segments.length,
      audioQuality: info.audioQuality,
    };
  }

  throw new Error('No stream URL available for this track.');
}

export async function playbackUrl(trackId: string, quality: string, json: boolean): Promise<void> {
  const client = await getApiClient();

  try {
    const result = await playbackUrlData(trackId, quality, client);

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.type === 'direct') {
      console.log(result.url);
    } else {
      console.log(`DASH stream (${result.segmentCount} segments)`);
      console.log(`  Init: ${result.initUrl}`);
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

export async function playbackPlay(trackId: string, quality: string): Promise<void> {
  const info = await fetchTrackManifest(trackId, quality);
  const stream = decodeManifest(info.manifest, info.manifestMimeType);

  const isFlac = info.formats.includes('FLAC') || info.formats.includes('FLAC_HIRES');
  const ext = isFlac ? '.flac' : '.mp4';
  const tmpFile = path.join(os.tmpdir(), `tidal-${trackId}${ext}`);

  console.log(`\nDownloading track ${trackId} (${info.audioQuality}, ${info.formats.join('/')})...`);

  let audioData: Buffer;
  if (stream.type === 'direct' && stream.url) {
    const streamRes = await fetch(stream.url);
    if (!streamRes.ok) {
      console.error(`Error: Failed to download stream (${streamRes.status}).`);
      process.exit(1);
    }
    audioData = Buffer.from(await streamRes.arrayBuffer());
  } else if (stream.type === 'dash' && stream.dash) {
    audioData = await downloadDashStream(stream.dash);
  } else {
    console.error('Error: No stream available for this track.');
    process.exit(1);
  }

  fs.writeFileSync(tmpFile, audioData);

  const player = process.platform === 'darwin' ? 'afplay'
    : process.platform === 'win32' ? 'start'
    : 'mpv --no-video';

  console.log(`Playing... Press Ctrl+C to stop.\n`);

  return new Promise<void>((resolve, reject) => {
    const child = exec(`${player} "${tmpFile}"`, (err) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      if (err && err.killed) {
        resolve();
      } else if (err) {
        reject(new Error(`Playback failed: ${err.message}`));
      } else {
        resolve();
      }
    });

    process.on('SIGINT', () => {
      child.kill();
      try { fs.unlinkSync(tmpFile); } catch {}
      console.log('\nPlayback stopped.');
      process.exit(0);
    });
  });
}
