const { isoToday, addDays, daysBetween } = require('./store');

function humanInterval(days) {
  const n = Number(days);
  if (n % 365 === 0) return `${n / 365} year${n / 365 === 1 ? '' : 's'}`;
  if (n % 30 === 0) return `${n / 30} month${n / 30 === 1 ? '' : 's'}`;
  if (n % 7 === 0) return `${n / 7} week${n / 7 === 1 ? '' : 's'}`;
  return `${n} day${n === 1 ? '' : 's'}`;
}

function createTools(store) {
  const definitions = [
    {
      name: 'add_maintenance_item',
      title: 'Add maintenance item',
      description: 'Remember a household item and how often it should be serviced.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string' },
          intervalDays: { type: 'number', minimum: 1 },
          lastServiceDate: { type: 'string', description: 'YYYY-MM-DD' },
          notes: { type: 'string' }
        },
        required: ['name', 'intervalDays']
      }
    },
    {
      name: 'log_service',
      title: 'Log service',
      description: 'Record that a maintenance item was serviced or replaced.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          note: { type: 'string' }
        },
        required: ['name']
      }
    },
    {
      name: 'list_due',
      title: 'List due maintenance',
      description: 'List maintenance items that are overdue or due within a horizon.',
      inputSchema: {
        type: 'object',
        properties: {
          horizonDays: { type: 'number', minimum: 0, default: 30 }
        }
      }
    },
    {
      name: 'lookup_item',
      title: 'Look up maintenance item',
      description: 'Find the maintenance status and notes for one household item.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      }
    },
    {
      name: 'list_items',
      title: 'List all items',
      description: 'List every household maintenance item currently remembered.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'set_item_note',
      title: 'Set item note',
      description: 'Attach a useful note such as a filter size, model, or location.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string' }, note: { type: 'string' } },
        required: ['name', 'note']
      }
    }
  ];

  async function call(name, args = {}) {
    switch (name) {
      case 'add_maintenance_item': {
        const asset = store.addAsset(args);
        return {
          text: `Saved ${asset.name}. I'll treat it as due every ${humanInterval(asset.intervalDays)}.`,
          data: enrich(asset)
        };
      }
      case 'log_service': {
        const asset = store.logService(args);
        const dueDate = addDays(asset.lastServiceDate, asset.intervalDays);
        return {
          text: `Logged ${asset.name} as serviced on ${asset.lastServiceDate}. Next due: ${dueDate}.`,
          data: enrich(asset)
        };
      }
      case 'list_due': {
        const horizonDays = Number(args.horizonDays ?? 30);
        const items = store.dueItems({ horizonDays });
        if (!items.length) {
          return { text: `Nothing is due in the next ${horizonDays} days.`, data: [] };
        }
        const summary = items
          .map((item) => {
            if (item.daysRemaining < 0) return `${item.name} is ${Math.abs(item.daysRemaining)} days overdue`;
            if (item.daysRemaining === 0) return `${item.name} is due today`;
            return `${item.name} is due in ${item.daysRemaining} days`;
          })
          .join('; ');
        return { text: summary, data: items };
      }
      case 'lookup_item': {
        const asset = store.findAsset(args.name);
        if (!asset) throw new Error(`I couldn't find an item matching "${args.name}".`);
        const item = enrich(asset);
        return {
          text: `${asset.name} was last serviced on ${asset.lastServiceDate}; next due ${item.dueDate}.${asset.notes ? ` Note: ${asset.notes}` : ''}`,
          data: item
        };
      }
      case 'list_items': {
        const items = store.listAssets().map(enrich);
        return {
          text: items.length ? `I remember ${items.length} maintenance item${items.length === 1 ? '' : 's'}.` : 'No maintenance items saved yet.',
          data: items
        };
      }
      case 'set_item_note': {
        const asset = store.setNote(args);
        return { text: `Updated the note for ${asset.name}.`, data: enrich(asset) };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  function enrich(asset) {
    const today = isoToday();
    const dueDate = addDays(asset.lastServiceDate, asset.intervalDays);
    return {
      ...asset,
      dueDate,
      daysRemaining: daysBetween(today, dueDate)
    };
  }

  return { definitions, call };
}

module.exports = { createTools, humanInterval };
