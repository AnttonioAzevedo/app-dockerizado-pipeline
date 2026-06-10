const express = require('express');

const router = express.Router();

let tasks = [];
let nextId = 1;

router.get('/', (req, res) => {
  res.json(tasks);
});

router.post('/', (req, res) => {
  const { title } = req.body;
  const task = { id: nextId, title };
  nextId += 1;
  tasks = [...tasks, task];
  res.status(201).json(task);
});

router.get('/:id', (req, res) => {
  const task = tasks.find((t) => t.id === Number(req.params.id));
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

router.delete('/:id', (req, res) => {
  const exists = tasks.some((t) => t.id === Number(req.params.id));
  if (!exists) {
    return res.status(404).json({ error: 'Task not found' });
  }
  tasks = tasks.filter((t) => t.id !== Number(req.params.id));
  res.status(204).send();
});

module.exports = router;
