const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

test('GET /health returns 200 and status ok', async () => {
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
  assert.ok(typeof res.body.uptime === 'number');
});

test('POST /tasks creates a task and returns 201 with id', async () => {
  const res = await request(app).post('/tasks').send({ title: 'Buy milk' });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.id);
  assert.strictEqual(res.body.title, 'Buy milk');
});

test('GET /tasks lists the created task', async () => {
  const res = await request(app).get('/tasks');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.some((t) => t.title === 'Buy milk'));
});
