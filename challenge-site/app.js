const STORAGE_KEY = 'homeops-webmcp-challenge-v2';
const APP_VERSION = 2;

const seedState = {
  version: APP_VERSION,
  items: [
    {
      id: 'hvac-filter',
      name: 'HVAC filter',
      category: 'Air quality',
      intervalDays: 90,
      lastServiceDate: '2026-06-01',
      estimatedMinutes: 10,
      notes: '20 × 20 × 1 filter'
    },
    {
      id: 'dryer-vent',
      name: 'Dryer vent',
      category: 'Laundry',
      intervalDays: 180,
      lastServiceDate: '2026-03-05',
      estimatedMinutes: 35,
      notes: 'Clean the exterior flap and flexible duct'
    },
    {
      id: 'smoke-detectors',
      name: 'Smoke detector test',
      category: 'Safety',
      intervalDays: 90,
      lastServiceDate: '2026-06-15',
      estimatedMinutes: 15,
      notes: 'Test every unit and replace weak batteries'
    },
    {
      id: 'water-heater',
      name: 'Water heater flush',
      category: 'Plumbing',
      intervalDays: 365,
      lastServiceDate: '2025-10-01',
      estimatedMinutes: 60,
      notes: 'Annual sediment flush'
    }
  ],
  plan: null,
  activity: [
    {
      id: 'seed-activity',
      actor: 'system',
      title: 'Shared workspace ready',
      detail: 'HomeOps loaded the household maintenance record.',
      at: '2026-09-01T12:00:00.000Z'
    }
  ]
};

const clone = value => JSON.parse(JSON.stringify(value));
const now = () => new Date();
const isoDate = value => new Date(value).toISOString().slice(0, 10);
const makeId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed?.version === APP_VERSION && Array.isArray(parsed.items)) return parsed;
  } catch (error) {
    console.warn('Could not load HomeOps state', error);
  }
  return clone(seedState);
}

let state = loadState();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function addActivity(actor, title, detail) {
  state.activity.unshift({ id: makeId('activity'), actor, title, detail, at: now().toISOString() });
  state.activity = state.activity.slice(0, 8);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + Number(days));
  return date;
}

function daysFromToday(target) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / 86400000);
}

function enrich(item) {
  const dueDate = addDays(item.lastServiceDate, item.intervalDays);
  return { ...item, dueDate: isoDate(dueDate), daysRemaining: daysFromToday(dueDate) };
}

function allItems() {
  return state.items.map(enrich).sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function listDue(horizonDays = 30) {
  const horizon = Math.max(0, Number(horizonDays) || 30);
  return allItems().filter(item => item.daysRemaining <= horizon);
}

function findItem(name) {
  if (!name || typeof name !== 'string') return null;
  const query = name.trim().toLowerCase();
  const exact = state.items.find(item => item.name.toLowerCase() === query);
  const partial = state.items.find(item => item.name.toLowerCase().includes(query) || query.includes(item.name.toLowerCase()));
  const match = exact || partial;
  return match ? enrich(match) : null;
}

function getStateSnapshot() {
  return {
    generatedAt: now().toISOString(),
    items: allItems(),
    plan: state.plan,
    activity: state.activity
  };
}

function proposeSession({ horizonDays = 30, limit = 3, title = 'Next home work session', rationale = '' } = {}) {
  const safeLimit = Math.min(5, Math.max(1, Number(limit) || 3));
  const candidates = listDue(horizonDays).slice(0, safeLimit);
  if (!candidates.length) throw new Error('Nothing is due within the requested horizon.');

  state.plan = {
    id: makeId('plan'),
    title: String(title).slice(0, 90),
    rationale: String(rationale || 'Prioritized by due date so the person can review one focused session.').slice(0, 240),
    horizonDays: Math.max(0, Number(horizonDays) || 30),
    status: 'pending',
    tasks: candidates.map((item, index) => ({
      priority: index + 1,
      itemId: item.id,
      name: item.name,
      dueDate: item.dueDate,
      daysRemaining: item.daysRemaining,
      estimatedMinutes: item.estimatedMinutes
    })),
    createdAt: now().toISOString(),
    humanNote: ''
  };

  addActivity('agent', 'Agent proposed a work session', `${candidates.length} tasks are waiting for human review.`);
  persist();
  return {
    plan: state.plan,
    nextStep: 'Wait for the person to approve or request a revision, then call homeops_get_plan_status.'
  };
}

function getPlanStatus() {
  return {
    plan: state.plan,
    instruction: state.plan?.status === 'pending'
      ? 'Do not treat this proposal as approved. Wait for the person to respond in the HomeOps interface.'
      : 'The latest human decision is reflected in plan.status and humanNote.'
  };
}

function approvePlan() {
  if (!state.plan) return;
  state.plan.status = 'approved';
  state.plan.decidedAt = now().toISOString();
  state.plan.humanNote = 'Approved as proposed.';
  addActivity('human', 'Person approved the session', `${state.plan.tasks.length} proposed tasks are approved.`);
  persist();
}

function requestRevision() {
  if (!state.plan) return;
  state.plan.status = 'revision_requested';
  state.plan.decidedAt = now().toISOString();
  state.plan.humanNote = 'Revise this to the two shortest tasks first.';
  addActivity('human', 'Person requested a revision', state.plan.humanNote);
  persist();
}

function logService({ name, date, note = '', confirmedByHuman = false } = {}) {
  if (!confirmedByHuman) throw new Error('Human confirmation is required before recording completed work.');
  const found = findItem(name);
  if (!found) throw new Error(`No maintenance item found for “${name}”.`);
  const raw = state.items.find(item => item.id === found.id);
  raw.lastServiceDate = date ? isoDate(`${date}T12:00:00`) : isoDate(now());
  if (note) raw.notes = String(note).slice(0, 240);
  const updated = enrich(raw);
  addActivity('agent', 'Agent recorded confirmed service', `${updated.name} is next due ${updated.dueDate}.`);
  persist();
  return { item: updated, message: 'Service recorded after human confirmation.' };
}

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || makeId('item');
}

function addItem({ name, intervalDays, category = 'Home', lastServiceDate, estimatedMinutes = 20, notes = '', confirmedByHuman = false } = {}) {
  if (!confirmedByHuman) throw new Error('Human confirmation is required before adding a recurring responsibility.');
  if (!name || !Number(intervalDays)) throw new Error('name and intervalDays are required.');
  if (findItem(name)) throw new Error('A similar maintenance item already exists.');

  const item = {
    id: slugify(name),
    name: String(name).trim().slice(0, 80),
    category: String(category).trim().slice(0, 40),
    intervalDays: Math.min(3650, Math.max(1, Number(intervalDays))),
    lastServiceDate: lastServiceDate ? isoDate(`${lastServiceDate}T12:00:00`) : isoDate(now()),
    estimatedMinutes: Math.min(480, Math.max(5, Number(estimatedMinutes) || 20)),
    notes: String(notes).slice(0, 240)
  };

  state.items.push(item);
  addActivity('agent', 'Agent added a confirmed responsibility', `${item.name} repeats every ${item.intervalDays} days.`);
  persist();
  return { item: enrich(item), message: 'Recurring maintenance item added after human confirmation.' };
}

function relativeLabel(days) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'due today';
  return `${days}d`;
}

function formatActivityTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function render() {
  const items = allItems();
  const overdue = items.filter(item => item.daysRemaining < 0).length;
  const next30 = items.filter(item => item.daysRemaining >= 0 && item.daysRemaining <= 30).length;
  const planLabel = state.plan ? state.plan.status.replace('_', ' ') : 'none';

  document.getElementById('stats').innerHTML = [
    [items.length, 'tracked responsibilities'],
    [overdue, 'overdue now'],
    [next30, 'due in 30 days'],
    [planLabel, 'latest human decision']
  ].map(([value, label]) => `<div class="stat"><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`).join('');

  const dueItems = listDue(30);
  document.getElementById('dueList').innerHTML = dueItems.length
    ? dueItems.map(item => `<div class="due"><div class="row"><strong>${escapeHtml(item.name)}</strong><span class="badge ${item.daysRemaining < 0 ? 'overdue' : item.daysRemaining <= 10 ? 'soon' : ''}">${escapeHtml(relativeLabel(item.daysRemaining))}</span></div><div class="meta">Next due ${escapeHtml(item.dueDate)} · ${escapeHtml(item.category)} · about ${item.estimatedMinutes} min</div></div>`).join('')
    : '<div class="empty">Nothing is due in the next 30 days.</div>';

  document.getElementById('itemsGrid').innerHTML = items.map(item => `<div class="item"><div class="row"><strong>${escapeHtml(item.name)}</strong><span class="badge">${escapeHtml(item.category)}</span></div><div class="meta">Last serviced ${escapeHtml(item.lastServiceDate)} · every ${item.intervalDays} days</div><div class="meta">${escapeHtml(item.notes || 'No note saved.')}</div></div>`).join('');

  const planPanel = document.getElementById('planPanel');
  const planState = document.getElementById('planState');
  planState.className = 'plan-state';

  if (!state.plan) {
    planState.textContent = 'No proposal';
    planPanel.innerHTML = '<div class="empty">Run the WebMCP agent demo to create a proposal that a person can approve or revise.</div>';
  } else {
    const plan = state.plan;
    planState.textContent = plan.status.replace('_', ' ');
    planState.classList.add(plan.status === 'revision_requested' ? 'revision' : plan.status);
    planPanel.innerHTML = `
      <div class="proposal-title"><div><h3>${escapeHtml(plan.title)}</h3><small>${escapeHtml(plan.rationale)}</small></div><span class="badge">${plan.horizonDays} days</span></div>
      <ol class="proposal-list">${plan.tasks.map(task => `<li><span class="priority">${task.priority}</span><span><strong>${escapeHtml(task.name)}</strong><small>${escapeHtml(relativeLabel(task.daysRemaining))}</small></span><small>${task.estimatedMinutes} min</small></li>`).join('')}</ol>
      ${plan.status === 'pending' ? '<div class="plan-actions"><button id="approvePlan" class="small-btn approve">Approve proposal</button><button id="revisePlan" class="small-btn revise">Request shorter session</button></div>' : `<div class="decision-note"><strong>Human decision:</strong> ${escapeHtml(plan.humanNote)}</div>`}
    `;
    document.getElementById('approvePlan')?.addEventListener('click', approvePlan);
    document.getElementById('revisePlan')?.addEventListener('click', requestRevision);
  }

  document.getElementById('activityList').innerHTML = state.activity.map(entry => {
    const letter = entry.actor === 'human' ? 'H' : entry.actor === 'agent' ? 'A' : 'S';
    return `<li><span class="actor ${entry.actor === 'human' ? 'human' : ''}">${letter}</span><span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.detail)} · ${escapeHtml(formatActivityTime(entry.at))}</small></span></li>`;
  }).join('');
}

const toolDefinitions = [
  {
    name: 'homeops_get_state',
    description: 'Get the current HomeOps household maintenance record, active human-agent work-session proposal, and recent activity. Use this first to understand the shared state before proposing or changing anything.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    execute: async () => getStateSnapshot()
  },
  {
    name: 'homeops_list_due',
    description: 'List household maintenance responsibilities that are overdue or due within a chosen number of days. Use this to audit upcoming work without changing any state.',
    inputSchema: {
      type: 'object',
      properties: { horizonDays: { type: 'number', minimum: 0, maximum: 365, default: 30, description: 'How many days ahead to inspect.' } },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    execute: async ({ horizonDays = 30 } = {}) => ({ horizonDays, items: listDue(horizonDays) })
  },
  {
    name: 'homeops_lookup_item',
    description: 'Look up one household maintenance responsibility by name and return its service history, note, interval, and next due date.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', minLength: 1, maxLength: 80, description: 'The maintenance item to find, such as HVAC filter.' } },
      required: ['name'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    execute: async ({ name }) => {
      const item = findItem(name);
      if (!item) throw new Error(`No maintenance item found for “${name}”.`);
      return { item };
    }
  },
  {
    name: 'homeops_propose_session',
    description: 'Create a visible, prioritized household maintenance work-session proposal for the person to approve or revise. This does not authorize or complete work. After calling it, wait for human review and use homeops_get_plan_status to read the decision.',
    inputSchema: {
      type: 'object',
      properties: {
        horizonDays: { type: 'number', minimum: 0, maximum: 365, default: 30 },
        limit: { type: 'number', minimum: 1, maximum: 5, default: 3 },
        title: { type: 'string', maxLength: 90 },
        rationale: { type: 'string', maxLength: 240 }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    execute: async args => proposeSession(args)
  },
  {
    name: 'homeops_get_plan_status',
    description: 'Read the current work-session proposal and the person’s latest approval or revision request. Call this after homeops_propose_session before treating a proposal as approved.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    execute: async () => getPlanStatus()
  },
  {
    name: 'homeops_log_service',
    description: 'Record maintenance the person confirms was completed. Set confirmedByHuman to true only after the person has explicitly confirmed completion. Updates the shared record and visible interface.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 80 },
        date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Optional YYYY-MM-DD completion date.' },
        note: { type: 'string', maxLength: 240 },
        confirmedByHuman: { type: 'boolean', description: 'Must be true only after explicit human confirmation.' }
      },
      required: ['name', 'confirmedByHuman'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    execute: async args => logService(args)
  },
  {
    name: 'homeops_add_item',
    description: 'Add a recurring household maintenance responsibility after the person explicitly confirms it. Use narrow details: name, interval, category, last service date, estimated time, and an optional note.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 80 },
        intervalDays: { type: 'number', minimum: 1, maximum: 3650 },
        category: { type: 'string', maxLength: 40 },
        lastServiceDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        estimatedMinutes: { type: 'number', minimum: 5, maximum: 480 },
        notes: { type: 'string', maxLength: 240 },
        confirmedByHuman: { type: 'boolean', description: 'Must be true only after explicit human confirmation.' }
      },
      required: ['name', 'intervalDays', 'confirmedByHuman'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    execute: async args => addItem(args)
  }
];

async function registerWebMCP() {
  const indicator = document.getElementById('webmcpStatus');
  const modelContext = document.modelContext || navigator.modelContext;
  if (!modelContext?.registerTool) {
    indicator.textContent = 'WEBMCP READY · OPEN IN CHATGPT';
    indicator.title = 'This browser does not expose WebMCP. The page still demonstrates the exact same tool handlers.';
    return;
  }

  const controller = new AbortController();
  try {
    for (const tool of toolDefinitions) {
      await modelContext.registerTool(tool, { signal: controller.signal });
    }
    indicator.textContent = `WEBMCP LIVE · ${toolDefinitions.length} TOOLS`;
    window.addEventListener('pagehide', () => controller.abort(), { once: true });
  } catch (error) {
    console.error('WebMCP registration failed', error);
    indicator.textContent = 'WEBMCP REGISTRATION ERROR';
    indicator.title = error?.message || String(error);
  }
}

async function callToolForDemo(name, args) {
  const testing = navigator.modelContextTesting || document.modelContextTesting;
  if (testing?.getTools && testing?.executeTool) {
    try {
      const tools = await testing.getTools();
      const tool = tools.find(candidate => candidate.name === name);
      if (tool) {
        const result = await testing.executeTool(tool, JSON.stringify(args));
        return { route: 'navigator.modelContextTesting', result };
      }
    } catch (error) {
      console.warn('WebMCP testing API invocation failed; using the same registered handler directly.', error);
    }
  }
  const tool = toolDefinitions.find(candidate => candidate.name === name);
  return { route: 'registered tool handler', result: await tool.execute(args) };
}

async function runAgentDemo() {
  const log = document.getElementById('agentLog');
  const button = document.getElementById('agentDemo');
  button.disabled = true;
  log.textContent = 'Agent is discovering HomeOps capabilities…';
  try {
    const dueResult = await callToolForDemo('homeops_list_due', { horizonDays: 30 });
    log.textContent = `1. Discovered ${toolDefinitions.length} narrow tools.\n2. Called homeops_list_due through ${dueResult.route}.\n3. Found ${listDue(30).length} responsibilities within 30 days.\n4. Preparing a proposal for human review…`;
    await new Promise(resolve => setTimeout(resolve, 650));
    const proposal = await callToolForDemo('homeops_propose_session', {
      horizonDays: 30,
      limit: 3,
      title: '30-day maintenance sprint',
      rationale: 'Handle the most time-sensitive work in one focused session, then wait for the person’s approval.'
    });
    log.textContent = `Agent used ${proposal.route}.\n\nProposal created successfully. No work was marked complete. The agent is now waiting for the person to approve or request a revision.\n\nNext tool: homeops_get_plan_status`;
  } catch (error) {
    console.error(error);
    log.textContent = `Demo error: ${error?.message || error}`;
  } finally {
    button.disabled = false;
  }
}

document.getElementById('agentDemo').addEventListener('click', runAgentDemo);
document.getElementById('reset').addEventListener('click', () => {
  state = clone(seedState);
  localStorage.removeItem(STORAGE_KEY);
  persist();
  document.getElementById('agentLog').textContent = 'Demo reset. Ready for an agent task.';
});

render();
registerWebMCP();
