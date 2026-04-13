import { Router } from 'express';
import * as pm from '../services/projectManager.js';

const router = Router();

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }
  const project = pm.createProject(name);
  res.status(201).json(project);
});

router.get('/', (_req, res) => {
  res.json(pm.listProjects());
});

router.get('/:id', (req, res) => {
  const project = pm.getProject(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

router.put('/:id', (req, res) => {
  const { name, timeline, mediaIds } = req.body;
  const updated = pm.updateProject(req.params.id, { name, timeline, mediaIds });
  if (!updated) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const deleted = pm.deleteProject(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ success: true });
});

export { router as projectRouter };
