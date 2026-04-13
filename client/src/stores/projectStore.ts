import { create } from 'zustand';
import type { Project, MediaFile } from '../types';
import { api } from '../api/client';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  mediaFiles: MediaFile[];
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  openProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  loadMedia: () => Promise<void>;
  uploadMedia: (file: File) => Promise<MediaFile>;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  mediaFiles: [],
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await api.listProjects();
      set({ projects, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  createProject: async (name) => {
    const project = await api.createProject(name);
    set((s) => ({ projects: [project, ...s.projects], currentProject: project }));
    return project;
  },

  openProject: async (id) => {
    set({ isLoading: true });
    try {
      const project = await api.getProject(id);
      set({ currentProject: project, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  saveProject: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    await api.updateProject(currentProject.id, {
      timeline: currentProject.timeline,
      mediaIds: currentProject.mediaIds,
    });
  },

  deleteProject: async (id) => {
    await api.deleteProject(id);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProject: s.currentProject?.id === id ? null : s.currentProject,
    }));
  },

  loadMedia: async () => {
    try {
      const mediaFiles = await api.getMedia();
      set({ mediaFiles });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  uploadMedia: async (file) => {
    const media = await api.uploadVideo(file);
    set((s) => ({ mediaFiles: [...s.mediaFiles, media] }));
    return media;
  },

  setCurrentProject: (project) => set({ currentProject: project }),
}));
