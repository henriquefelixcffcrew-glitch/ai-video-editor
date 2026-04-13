import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Project, Timeline } from '../types/index.js';

const DATA_DIR = path.resolve('data', 'projects');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function projectPath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export function createProject(name: string): Project {
  ensureDir();
  const project: Project = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: {
      tracks: [
        { id: uuidv4(), type: 'video', clips: [] },
        { id: uuidv4(), type: 'audio', clips: [] },
      ],
      duration: 0,
    },
    mediaIds: [],
  };
  fs.writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2));
  return project;
}

export function getProject(id: string): Project | null {
  const p = projectPath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export function listProjects(): Project[] {
  ensureDir();
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'timeline' | 'mediaIds'>>): Project | null {
  const project = getProject(id);
  if (!project) return null;

  const updated = {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(projectPath(id), JSON.stringify(updated, null, 2));
  return updated;
}

export function deleteProject(id: string): boolean {
  const p = projectPath(id);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}
