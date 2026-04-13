import type { AIStrategy, Timeline, MediaFile, TimelineAction } from '../types/index.js';
import { cutSilenceStrategy } from '../strategies/cutSilence.js';

const strategies: AIStrategy[] = [cutSilenceStrategy];

export function registerStrategy(strategy: AIStrategy) {
  strategies.push(strategy);
}

export async function executePrompt(
  prompt: string,
  timeline: Timeline,
  mediaFiles: MediaFile[]
): Promise<{ strategy: string; actions: TimelineAction[] } | null> {
  const normalizedPrompt = prompt.toLowerCase().trim();

  for (const strategy of strategies) {
    if (strategy.match(normalizedPrompt)) {
      const actions = await strategy.execute(normalizedPrompt, timeline, mediaFiles);
      return { strategy: strategy.name, actions };
    }
  }

  return null;
}
