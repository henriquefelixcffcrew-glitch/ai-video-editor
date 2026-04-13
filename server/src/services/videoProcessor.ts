import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import type { VideoMetadata, Timeline, MediaFile, ExportSettings } from '../types/index.js';

export function probeVideo(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      const audioStream = data.streams.find((s) => s.codec_type === 'audio');

      resolve({
        duration: data.format.duration ?? 0,
        width: videoStream?.width ?? 0,
        height: videoStream?.height ?? 0,
        fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : 30,
        codec: videoStream?.codec_name ?? 'unknown',
        audioCodec: audioStream?.codec_name,
      });
    });
  });
}

export interface SilenceRange {
  start: number;
  end: number;
  duration: number;
}

export function detectSilence(
  filePath: string,
  threshold: number = -30,
  minDuration: number = 0.5
): Promise<SilenceRange[]> {
  return new Promise((resolve, reject) => {
    const silenceRanges: SilenceRange[] = [];
    let currentStart: number | null = null;

    ffmpeg(filePath)
      .audioFilters(`silencedetect=noise=${threshold}dB:d=${minDuration}`)
      .format('null')
      .output('-')
      .on('stderr', (line: string) => {
        const startMatch = line.match(/silence_start:\s*([\d.]+)/);
        const endMatch = line.match(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/);

        if (startMatch) {
          currentStart = parseFloat(startMatch[1]);
        }
        if (endMatch && currentStart !== null) {
          silenceRanges.push({
            start: currentStart,
            end: parseFloat(endMatch[1]),
            duration: parseFloat(endMatch[2]),
          });
          currentStart = null;
        }
      })
      .on('end', () => resolve(silenceRanges))
      .on('error', reject)
      .run();
  });
}

export async function exportTimeline(
  timeline: Timeline,
  mediaFiles: MediaFile[],
  settings: ExportSettings,
  onProgress?: (percent: number) => void
): Promise<string> {
  const outputDir = path.resolve('uploads', 'exports');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `export_${Date.now()}.mp4`);

  const resMap = { '720p': '1280:720', '1080p': '1920:1080', '4k': '3840:2160' };
  const crf = { low: 28, medium: 23, high: 18 };

  const videoTrack = timeline.tracks.find((t) => t.type === 'video');
  if (!videoTrack || videoTrack.clips.length === 0) {
    throw new Error('No video clips in timeline');
  }

  const clips = [...videoTrack.clips].sort((a, b) => a.startTime - b.startTime);

  if (clips.length === 1) {
    const clip = clips[0];
    const media = mediaFiles.find((m) => m.id === clip.mediaId);
    if (!media) throw new Error(`Media not found: ${clip.mediaId}`);

    return new Promise((resolve, reject) => {
      ffmpeg(media.path)
        .setStartTime(clip.inPoint)
        .setDuration(clip.outPoint - clip.inPoint)
        .videoFilter(`scale=${resMap[settings.resolution]}`)
        .outputOptions([`-crf ${crf[settings.quality]}`, `-r ${settings.fps}`])
        .output(outputPath)
        .on('progress', (p) => onProgress?.(Math.round(p.percent ?? 0)))
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  const listFile = path.join(outputDir, `concat_${Date.now()}.txt`);
  const tempFiles: string[] = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const media = mediaFiles.find((m) => m.id === clip.mediaId);
    if (!media) continue;

    const tempPath = path.join(outputDir, `temp_${Date.now()}_${i}.mp4`);
    tempFiles.push(tempPath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(media.path)
        .setStartTime(clip.inPoint)
        .setDuration(clip.outPoint - clip.inPoint)
        .videoFilter(`scale=${resMap[settings.resolution]}`)
        .outputOptions([`-crf ${crf[settings.quality]}`, `-r ${settings.fps}`])
        .output(tempPath)
        .on('end', () => {
          onProgress?.(Math.round(((i + 1) / clips.length) * 80));
          resolve();
        })
        .on('error', reject)
        .run();
    });
  }

  fs.writeFileSync(listFile, tempFiles.map((f) => `file '${f}'`).join('\n'));

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .output(outputPath)
      .on('end', () => {
        onProgress?.(100);
        resolve();
      })
      .on('error', reject)
      .run();
  });

  fs.unlinkSync(listFile);
  tempFiles.forEach((f) => { try { fs.unlinkSync(f); } catch {} });

  return outputPath;
}
