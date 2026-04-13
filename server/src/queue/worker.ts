import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { probeVideo, detectSilence, exportTimeline } from '../services/videoProcessor.js';

const connection = new IORedis({ maxRetriesPerRequest: null });

const videoWorker = new Worker(
  'video-processing',
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    switch (job.name) {
      case 'probe': {
        const metadata = await probeVideo(job.data.filePath);
        return metadata;
      }
      case 'detect-silence': {
        const silenceRanges = await detectSilence(
          job.data.filePath,
          job.data.threshold ?? -30,
          job.data.minDuration ?? 0.5
        );
        return silenceRanges;
      }
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  { connection, concurrency: 2 }
);

const exportWorker = new Worker(
  'video-export',
  async (job) => {
    console.log(`Export job ${job.id}`);
    const outputPath = await exportTimeline(
      job.data.timeline,
      job.data.mediaFiles,
      job.data.settings,
      (progress) => job.updateProgress(progress)
    );
    return { outputPath };
  },
  { connection, concurrency: 1 }
);

videoWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

videoWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

exportWorker.on('completed', (job) => {
  console.log(`Export ${job.id} completed`);
});

exportWorker.on('failed', (job, err) => {
  console.error(`Export ${job?.id} failed:`, err.message);
});

console.log('Worker started — listening for jobs...');
