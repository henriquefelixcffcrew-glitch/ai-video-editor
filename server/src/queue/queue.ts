import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({ maxRetriesPerRequest: null });

export const videoQueue = new Queue('video-processing', { connection });
export const exportQueue = new Queue('video-export', { connection });

export { connection };
