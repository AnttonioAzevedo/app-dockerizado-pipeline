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

module.exports = router;
