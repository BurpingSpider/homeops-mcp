const { isoToday } = require('./store');

function normalize(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function intervalToDays(value, unit) {
  const n = Number(value);
  const u = unit.toLowerCase();
  if (u.startsWith('day')) return n;
  if (u.startsWith('week')) return n * 7;
  if (u.startsWith('month')) return n * 30;
  if (u.startsWith('year')) return n * 365;
  return n;
}

function cleanName(name) {
  return String(name || '')
    .replace(/^(the|my)\s+/i, '')
    .replace(/[?.!,]+$/g, '')
    .trim();
}

function parseCommand(input) {
  const text = normalize(input);

  if (!text) return { type: 'help' };
  if (/^(help|what can you do|show commands)/i.test(text)) return { type: 'help' };

  if (/\b(what('| i)s|what is) due\b|\bwhat needs attention\b|\bmaintenance brief\b/i.test(text)) {
    let horizonDays = 30;
    const days = text.match(/next\s+(\d+)\s+days?/i);
    const weeks = text.match(/next\s+(\d+)\s+weeks?/i);
    if (days) horizonDays = Number(days[1]);
    if (weeks) horizonDays = Number(weeks[1]) * 7;
    return { type: 'tool', name: 'list_due', args: { horizonDays } };
  }

  if (/\b(list|show)\s+(all\s+)?(items|assets|maintenance)\b/i.test(text)) {
    return { type: 'tool', name: 'list_items', args: {} };
  }

  let m = text.match(/(?:add|remember)\s+(?:the\s+|my\s+)?(.+?)\s+(?:and\s+)?(?:service|replace|change|check|clean|inspect)\s+(?:it\s+)?every\s+(\d+)\s*(day|days|week|weeks|month|months|year|years)/i);
  if (!m) {
    m = text.match(/(?:add|remember)\s+(?:the\s+|my\s+)?(.+?)\s+every\s+(\d+)\s*(day|days|week|weeks|month|months|year|years)/i);
  }
  if (m) {
    return {
      type: 'tool',
      name: 'add_maintenance_item',
      args: {
        name: cleanName(m[1]),
        intervalDays: intervalToDays(m[2], m[3]),
        lastServiceDate: isoToday()
      }
    };
  }

  m = text.match(/(?:i\s+)?(?:just\s+)?(?:replaced|changed|serviced|cleaned|inspected)\s+(?:the\s+|my\s+)?(.+?)(?:\s+(today|yesterday))?[.!?]?$/i);
  if (m) {
    let date = isoToday();
    if ((m[2] || '').toLowerCase() === 'yesterday') {
      const d = new Date(`${date}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      date = d.toISOString().slice(0, 10);
    }
    return { type: 'tool', name: 'log_service', args: { name: cleanName(m[1]), date } };
  }

  m = text.match(/(?:when did i last|when was the last time i)\s+(?:replace|change|service|clean|inspect)\s+(?:the\s+|my\s+)?(.+?)[?!.]?$/i);
  if (m) return { type: 'tool', name: 'lookup_item', args: { name: cleanName(m[1]) } };

  m = text.match(/(?:look up|status of|show me)\s+(?:the\s+|my\s+)?(.+?)[?!.]?$/i);
  if (m) return { type: 'tool', name: 'lookup_item', args: { name: cleanName(m[1]) } };

  m = text.match(/(?:note|remember)\s+(?:that\s+)?(?:the\s+|my\s+)?(.+?)\s+(?:uses|needs|is)\s+(.+?)[.!?]?$/i);
  if (m) return { type: 'tool', name: 'set_item_note', args: { name: cleanName(m[1]), note: m[2].trim() } };

  return { type: 'fallback', raw: text };
}

async function respond(text, tools) {
  const parsed = parseCommand(text);
  if (parsed.type === 'help') {
    return {
      text: 'Try: “Remember the HVAC filter and replace it every 90 days,” “I changed the HVAC filter today,” “What’s due?”, or “When did I last change the HVAC filter?”',
      parsed
    };
  }
  if (parsed.type === 'fallback') {
    return {
      text: 'I can manage household maintenance memory. Try adding an item with a service interval, logging that you serviced it, or asking what is due.',
      parsed
    };
  }
  try {
    const result = await tools.call(parsed.name, parsed.args);
    return { ...result, parsed };
  } catch (error) {
    return { text: error.message, error: true, parsed };
  }
}

module.exports = { parseCommand, respond, intervalToDays, cleanName };
