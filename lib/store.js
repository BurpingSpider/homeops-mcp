const fs = require('fs');
const path = require('path');

function isoToday(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  const from = new Date(`${fromIso}T12:00:00Z`);
  const to = new Date(`${toIso}T12:00:00Z`);
  return Math.round((to - from) / 86400000);
}

class Store {
  constructor(filePath) {
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      this.save({ version: 1, assets: [] });
    }
  }

  load() {
    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
  }

  save(data) {
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2));
    fs.renameSync(temp, this.filePath);
  }

  reset(seed = { version: 1, assets: [] }) {
    this.save(seed);
  }

  listAssets() {
    return this.load().assets;
  }

  findAsset(name) {
    const q = String(name || '').trim().toLowerCase();
    if (!q) return null;
    const assets = this.listAssets();
    return (
      assets.find((a) => a.name.toLowerCase() === q) ||
      assets.find((a) => a.name.toLowerCase().includes(q)) ||
      assets.find((a) => q.includes(a.name.toLowerCase())) ||
      null
    );
  }

  addAsset({ name, category = 'Home', intervalDays, lastServiceDate, notes = '' }) {
    if (!name || !String(name).trim()) throw new Error('Asset name is required.');
    if (!Number.isFinite(Number(intervalDays)) || Number(intervalDays) < 1) {
      throw new Error('intervalDays must be a positive number.');
    }
    const data = this.load();
    if (this.findAsset(name)) throw new Error(`An asset named "${name}" already exists.`);
    const today = isoToday();
    const asset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: String(name).trim(),
      category: String(category || 'Home').trim(),
      intervalDays: Number(intervalDays),
      lastServiceDate: lastServiceDate || today,
      notes: String(notes || '').trim(),
      createdAt: new Date().toISOString(),
      history: [
        {
          date: lastServiceDate || today,
          action: 'baseline',
          note: 'Initial maintenance baseline'
        }
      ]
    };
    data.assets.push(asset);
    this.save(data);
    return asset;
  }

  logService({ name, date, note = '' }) {
    const data = this.load();
    const q = String(name || '').trim().toLowerCase();
    const idx = data.assets.findIndex((a) =>
      a.name.toLowerCase() === q ||
      a.name.toLowerCase().includes(q) ||
      q.includes(a.name.toLowerCase())
    );
    if (idx < 0) throw new Error(`I couldn't find an asset matching "${name}".`);
    const serviceDate = date || isoToday();
    data.assets[idx].lastServiceDate = serviceDate;
    data.assets[idx].history.unshift({
      date: serviceDate,
      action: 'service',
      note: String(note || '').trim()
    });
    this.save(data);
    return data.assets[idx];
  }

  setNote({ name, note }) {
    const data = this.load();
    const q = String(name || '').trim().toLowerCase();
    const idx = data.assets.findIndex((a) =>
      a.name.toLowerCase() === q || a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase())
    );
    if (idx < 0) throw new Error(`I couldn't find an asset matching "${name}".`);
    data.assets[idx].notes = String(note || '').trim();
    this.save(data);
    return data.assets[idx];
  }

  dueItems({ horizonDays = 30, today = isoToday() } = {}) {
    return this.listAssets()
      .map((asset) => {
        const dueDate = addDays(asset.lastServiceDate, asset.intervalDays);
        const daysRemaining = daysBetween(today, dueDate);
        return {
          ...asset,
          dueDate,
          daysRemaining,
          status: daysRemaining < 0 ? 'overdue' : daysRemaining === 0 ? 'due_today' : 'upcoming'
        };
      })
      .filter((asset) => asset.daysRemaining <= Number(horizonDays))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
}

module.exports = { Store, isoToday, addDays, daysBetween };
