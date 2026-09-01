const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store } = require('../lib/store');
const { createTools } = require('../lib/tools');
const { parseCommand, respond } = require('../lib/agent');

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'homeops-'));
  const store = new Store(path.join(dir, 'data.json'));
  return { store, tools: createTools(store) };
}

test('parses recurring maintenance from natural language', () => {
  const p = parseCommand('Remember the dryer vent and clean it every 6 months');
  assert.equal(p.name, 'add_maintenance_item');
  assert.equal(p.args.name, 'dryer vent');
  assert.equal(p.args.intervalDays, 180);
});

test('adds and looks up an item through tools', async () => {
  const { tools } = setup();
  await tools.call('add_maintenance_item', { name: 'HVAC filter', intervalDays: 90, lastServiceDate: '2026-08-01' });
  const out = await tools.call('lookup_item', { name: 'HVAC filter' });
  assert.equal(out.data.name, 'HVAC filter');
  assert.equal(out.data.dueDate, '2026-10-30');
});

test('agent logs service from voice-like text', async () => {
  const { store, tools } = setup();
  store.addAsset({ name: 'HVAC filter', intervalDays: 90, lastServiceDate: '2026-01-01' });
  const out = await respond('I changed the HVAC filter today', tools);
  assert.match(out.text, /Logged HVAC filter/i);
});

test('MCP tool list has required core operations', () => {
  const { tools } = setup();
  const names = tools.definitions.map((x) => x.name);
  assert.deepEqual(names.slice(0, 5), ['add_maintenance_item','log_service','list_due','lookup_item','list_items']);
});
