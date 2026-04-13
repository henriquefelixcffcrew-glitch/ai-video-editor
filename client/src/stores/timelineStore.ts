import { create } from 'zustand';
import type { Timeline, Track, Clip } from '../types';

interface HistoryEntry {
  timeline: Timeline;
}

interface TimelineState {
  timeline: Timeline;
  playheadPosition: number;
  selectedClipId: string | null;
  isPlaying: boolean;
  zoom: number;
  history: HistoryEntry[];
  historyIndex: number;

  setTimeline: (timeline: Timeline) => void;
  setPlayheadPosition: (pos: number) => void;
  setSelectedClip: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;

  addClipToTrack: (trackId: string, clip: Clip) => void;
  removeClip: (clipId: string) => void;
  splitClipAtPlayhead: () => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

const defaultTimeline: Timeline = {
  tracks: [
    { id: 'track-video', type: 'video', clips: [] },
    { id: 'track-audio', type: 'audio', clips: [] },
  ],
  duration: 0,
};

export const useTimelineStore = create<TimelineState>((set, get) => ({
  timeline: defaultTimeline,
  playheadPosition: 0,
  selectedClipId: null,
  isPlaying: false,
  zoom: 1,
  history: [{ timeline: defaultTimeline }],
  historyIndex: 0,

  setTimeline: (timeline) => set({ timeline }),
  setPlayheadPosition: (pos) => set({ playheadPosition: pos }),
  setSelectedClip: (id) => set({ selectedClipId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  pushHistory: () => {
    const { timeline, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ timeline: JSON.parse(JSON.stringify(timeline)) });
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  addClipToTrack: (trackId, clip) => {
    get().pushHistory();
    set((state) => {
      const tracks = state.timeline.tracks.map((track) => {
        if (track.id !== trackId) return track;
        return { ...track, clips: [...track.clips, clip] };
      });
      const duration = Math.max(...tracks.flatMap((t) => t.clips.map((c) => c.endTime)), 0);
      return { timeline: { ...state.timeline, tracks, duration } };
    });
  },

  removeClip: (clipId) => {
    get().pushHistory();
    set((state) => {
      const tracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== clipId),
      }));
      const duration = Math.max(...tracks.flatMap((t) => t.clips.map((c) => c.endTime)), 0);
      return { timeline: { ...state.timeline, tracks, duration }, selectedClipId: null };
    });
  },

  splitClipAtPlayhead: () => {
    const { timeline, playheadPosition, selectedClipId } = get();
    if (!selectedClipId) return;

    const track = timeline.tracks.find((t) => t.clips.some((c) => c.id === selectedClipId));
    const clip = track?.clips.find((c) => c.id === selectedClipId);
    if (!track || !clip) return;

    if (playheadPosition <= clip.startTime || playheadPosition >= clip.endTime) return;

    get().pushHistory();

    const splitPoint = playheadPosition - clip.startTime + clip.inPoint;

    const clipA: Clip = {
      ...clip,
      endTime: playheadPosition,
      outPoint: splitPoint,
      duration: playheadPosition - clip.startTime,
    };

    const clipB: Clip = {
      id: generateId(),
      mediaId: clip.mediaId,
      trackId: clip.trackId,
      startTime: playheadPosition,
      endTime: clip.endTime,
      inPoint: splitPoint,
      outPoint: clip.outPoint,
      duration: clip.endTime - playheadPosition,
    };

    set((state) => {
      const tracks = state.timeline.tracks.map((t) => {
        if (t.id !== track.id) return t;
        const clips = t.clips.map((c) => (c.id === selectedClipId ? clipA : c));
        clips.push(clipB);
        clips.sort((a, b) => a.startTime - b.startTime);
        return { ...t, clips };
      });
      return { timeline: { ...state.timeline, tracks } };
    });
  },

  updateClip: (clipId, updates) => {
    set((state) => {
      const tracks = state.timeline.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
      }));
      return { timeline: { ...state.timeline, tracks } };
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({ timeline: JSON.parse(JSON.stringify(history[newIndex].timeline)), historyIndex: newIndex });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({ timeline: JSON.parse(JSON.stringify(history[newIndex].timeline)), historyIndex: newIndex });
  },
}));
