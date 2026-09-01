const chat = document.getElementById('chat');
const form = document.getElementById('commandForm');
const input = document.getElementById('command');
const dueList = document.getElementById('dueList');
const itemsGrid = document.getElementById('itemsGrid');
const micBtn = document.getElementById('micBtn');
const orb = document.getElementById('orb');
const status = document.getElementById('status');

function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function addMessage(text, role='assistant', error=false){const el=document.createElement('div');el.className=`message ${role}${error?' error':''}`;el.textContent=text;chat.appendChild(el);chat.scrollTop=chat.scrollHeight}
async function runCommand(text){if(!text.trim())return;addMessage(text,'user');input.value='';status.textContent='Thinking';try{const r=await fetch('/api/agent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})});const data=await r.json();addMessage(data.text,'assistant',data.error);if('speechSynthesis'in window&&!data.error){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(data.text);u.rate=1.02;speechSynthesis.speak(u)}await refresh()}catch(e){addMessage('The local demo server did not respond.','assistant',true)}finally{status.textContent='Ready'}}
async function refresh(){const r=await fetch('/api/state');const data=await r.json();renderDue(data.due);renderItems(data.assets)}
function renderDue(items){const relevant=items.filter(x=>x.daysRemaining<=30).slice(0,6);if(!relevant.length){dueList.innerHTML='<div class="due-card"><strong>All clear</strong><small>Nothing due in the next 30 days.</small></div>';return}dueList.innerHTML=relevant.map(i=>{let label=i.daysRemaining<0?`${Math.abs(i.daysRemaining)}d overdue`:i.daysRemaining===0?'Due today':`${i.daysRemaining}d`;let cls=i.daysRemaining<0?'overdue':i.daysRemaining<=10?'soon':'';return `<div class="due-card"><div class="due-row"><strong>${esc(i.name)}</strong><span class="badge ${cls}">${label}</span></div><small>Next due ${esc(i.dueDate)}</small></div>`}).join('')}
function renderItems(items){itemsGrid.innerHTML=items.map(i=>`<article class="item"><div class="category">${esc(i.category)}</div><h3>${esc(i.name)}</h3><dl><dt>Last service</dt><dd>${esc(i.lastServiceDate)}</dd><dt>Interval</dt><dd>${esc(i.intervalDays)} days</dd></dl>${i.notes?`<div class="note">${esc(i.notes)}</div>`:''}</article>`).join('')}
form.addEventListener('submit',e=>{e.preventDefault();runCommand(input.value)});document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>runCommand(b.dataset.command)));document.getElementById('resetBtn').addEventListener('click',async()=>{await fetch('/api/reset-demo',{method:'POST'});chat.innerHTML='<div class="message assistant">Demo reset. Ask me what needs attention.</div>';refresh()});
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){const rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.onstart=()=>{orb.classList.add('listening');status.textContent='Listening'};rec.onend=()=>{orb.classList.remove('listening');status.textContent='Ready'};rec.onerror=()=>{orb.classList.remove('listening');status.textContent='Voice unavailable'};rec.onresult=e=>{const text=e.results[0][0].transcript;input.value=text;runCommand(text)};micBtn.addEventListener('click',()=>rec.start())}else{micBtn.disabled=true;micBtn.title='Voice input is not supported in this browser'}
refresh();

async function callMcpTool(name, args = {}) {
  const r = await fetch('/mcp', {
    method: 'POST',
    headers: {'content-type': 'application/json', 'mcp-protocol-version': '2025-11-25'},
    body: JSON.stringify({jsonrpc:'2.0', id: Math.floor(Math.random()*1e9), method:'tools/call', params:{name, arguments:args}})
  });
  const payload = await r.json();
  if (payload.error) throw new Error(payload.error.message || 'MCP error');
  if (payload.result?.isError) throw new Error(payload.result?.content?.[0]?.text || 'Tool error');
  await refresh();
  return payload.result;
}

async function registerWebMCP() {
  const mc = document.modelContext || navigator.modelContext;
  const indicator = document.getElementById('webmcpStatus');
  if (!mc?.registerTool) {
    if (indicator) indicator.textContent = 'WEBMCP READY IN SUPPORTED BROWSER';
    return;
  }
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const specs = [
    {
      name: 'homeops_list_due',
      description: 'Return household maintenance items that are overdue or due soon, and update the visible HomeOps maintenance brief.',
      inputSchema: {type:'object',properties:{horizonDays:{type:'number',minimum:0,description:'Number of days ahead to inspect. Defaults to 30.'}}},
      annotations: { readOnlyHint: true },
      execute: async ({horizonDays=30}={}) => callMcpTool('list_due',{horizonDays})
    },
    {
      name: 'homeops_lookup_item',
      description: 'Look up when a specific household item was last serviced, when it is next due, and any saved note.',
      inputSchema: {type:'object',properties:{name:{type:'string',description:'Household maintenance item name'}},required:['name']},
      annotations: { readOnlyHint: true },
      execute: async ({name}) => callMcpTool('lookup_item',{name})
    },
    {
      name: 'homeops_log_service',
      description: 'Record that a household maintenance item was serviced or replaced. This changes HomeOps state and the visible dashboard.',
      inputSchema: {type:'object',properties:{name:{type:'string'},date:{type:'string',description:'Optional YYYY-MM-DD service date'},note:{type:'string'}},required:['name']},
      annotations: { readOnlyHint: false },
      execute: async ({name,date,note=''}) => callMcpTool('log_service',{name,date,note})
    },
    {
      name: 'homeops_add_maintenance_item',
      description: 'Add a new recurring household maintenance item with a service interval, making it available to people and agents in HomeOps.',
      inputSchema: {type:'object',properties:{name:{type:'string'},intervalDays:{type:'number',minimum:1},category:{type:'string'},lastServiceDate:{type:'string',description:'Optional YYYY-MM-DD'},notes:{type:'string'}},required:['name','intervalDays']},
      annotations: { readOnlyHint: false },
      execute: async ({name,intervalDays,category='Home',lastServiceDate,notes=''}) => callMcpTool('add_maintenance_item',{name,intervalDays,category,lastServiceDate,notes})
    }
  ];
  try {
    for (const spec of specs) await mc.registerTool(spec, options);
    if (indicator) indicator.textContent = `WEBMCP LIVE · ${specs.length} TOOLS`;
    window.addEventListener('beforeunload', () => controller.abort(), {once:true});
  } catch (e) {
    console.warn('WebMCP registration failed', e);
    if (indicator) indicator.textContent = 'WEBMCP REGISTRATION ERROR';
  }
}
registerWebMCP();
