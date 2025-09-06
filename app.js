// Monopoly Banker - app.js
// Implements player setup, transaction parsing, balance updates, and reset behavior per instructions.

const DEFAULT_PLAYERS = [
  { name: 'Giselle', code: 'g', balance: 1500 },
  { name: 'Mia', code: 'm', balance: 1500 },
  { name: 'Zian', code: 'z', balance: 1500 },
  { name: 'Tyrone', code: 't', balance: 1500 },
  { name: 'Stany', code: 's', balance: 1500 }
];

let players = [];
let lastChange = {}; // map shortcode -> change applied in last transaction

const el = selector => document.querySelector(selector);

function renderSetup() {
  const list = el('#players-list');
  list.innerHTML = '';
  players.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <input data-index="${i}" class="player-name" type="text" value="${escapeHtml(p.name)}" />
      <input data-index="${i}" class="player-code" type="text" maxlength="1" value="${escapeHtml(p.code)}" />
      <input data-index="${i}" class="player-balance" type="number" value="${p.balance}" />
    `;
    list.appendChild(row);
  });
}

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

function startGame() {
  // Read values from inputs and normalize
  const names = Array.from(document.querySelectorAll('.player-name')).map(i => i.value.trim() || '');
  const codes = Array.from(document.querySelectorAll('.player-code')).map(i => (i.value || '').trim().toLowerCase());
  const balances = Array.from(document.querySelectorAll('.player-balance')).map(i => Number(i.value) || 0);

  // validate uniqueness of shortcodes and non-empty
  const codeSet = new Set();
  for (let i=0;i<codes.length;i++){
    if (!codes[i] || codes[i].length !== 1) return showError('Each player must have a single-character shortcode.');
    if (codeSet.has(codes[i])) return showError('Player shortcodes must be unique.');
    codeSet.add(codes[i]);
  }

  players = names.map((name, i) => ({ name: name || DEFAULT_PLAYERS[i].name, code: codes[i], balance: balances[i] }));
  // ensure display order as specified
  const order = ['g','m','z','t','s'];
  players.sort((a,b)=> order.indexOf(a.code) - order.indexOf(b.code));

  el('#setup').hidden = true;
  el('#game').hidden = false;
  renderBalances();
  showError('');
}

function resetGame() {
  // revert to setup with defaults
  players = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
  lastChange = {};
  el('#setup').hidden = false;
  el('#game').hidden = true;
  renderSetup();
  showError('');
}

function renderBalances() {
  const list = el('#balances');
  list.innerHTML = '';
  // Must always display in the order Giselle, Mia, Zian, Tyrone, Stany
  const order = ['g','m','z','t','s'];
  order.forEach(code => {
    const p = players.find(x=>x.code===code);
    if (!p) return; // skip if missing
    const li = document.createElement('li');
    li.className = 'balance-item';
    const name = document.createElement('div');
    name.textContent = `${p.name} (${p.code})`;
    const bal = document.createElement('div');
    bal.innerHTML = `$${p.balance.toLocaleString()} ${lastChange[code] ? `<span class="balance-change">(${lastChange[code] > 0 ? '+' : ''}$${Math.abs(lastChange[code])})</span>` : ''}`;
    li.appendChild(name);
    li.appendChild(bal);
    list.appendChild(li);
  });
}

function showError(msg){ el('#error').textContent = msg || ''; }

function applyTransaction() {
  const input = el('#transaction-input').value.trim();
  if (!input) { showError('Please enter a transaction line.'); return }

  // Parse tokens (split by whitespace)
  const tokens = input.split(/\s+/);
  // We'll map positions of tokens. We need to pair numbers with nearest shortcode.
  // Build arrays of token objects with type 'num' or 'code' or 'other'
  const tokenObjs = tokens.map(t => {
    if (/^-?\d+$/.test(t)) return { type: 'num', value: Number(t) };
    if (/^[a-zA-Z]$/.test(t)) return { type: 'code', value: t.toLowerCase() };
    return { type: 'other', value: t };
  });

  // Find valid codes (only those that match current players)
  const validCodes = new Set(players.map(p=>p.code));

  // Walk tokens and pair numbers with nearest valid code (either side). Each token can be used only once.
  const used = new Array(tokenObjs.length).fill(false);
  const changes = {}; // code -> cumulative change for this line

  for (let i=0;i<tokenObjs.length;i++){
    const t = tokenObjs[i];
    if (t.type === 'code' && validCodes.has(t.value)){
      // try find a number immediately before or after (prefer immediate neighbor)
      let amount = null;
      // check previous
      if (i-1 >=0 && tokenObjs[i-1].type==='num' && !used[i-1]) amount = tokenObjs[i-1].value, used[i-1]=true;
      // else check next
      else if (i+1 < tokenObjs.length && tokenObjs[i+1].type==='num' && !used[i+1]) amount = tokenObjs[i+1].value, used[i+1]=true;
      if (amount !== null){
        changes[t.value] = (changes[t.value] || 0) + amount;
      }
      used[i]=true;
    }
  }

  // Also handle numbers followed by codes where code was not directly adjacent but number is nearer to that code than another? The spec: "A number is always associated with the nearest valid player shortcode, whether it appears immediately before or after it." The earlier loop handles immediate neighbors; for non-immediate we must pair remaining nums to nearest code by distance.
  // Collect remaining unused numbers and codes
  const remainingNums = [];
  const remainingCodes = [];
  tokenObjs.forEach((t, idx) => { if (!used[idx]){ if (t.type==='num') remainingNums.push({idx, val:t.value}); if (t.type==='code' && validCodes.has(t.value)) remainingCodes.push({idx, val:t.value}); }});

  remainingNums.forEach(numObj => {
    // find nearest code token index
    let best = null; let bestDist = Infinity;
    remainingCodes.forEach(codeObj => {
      const d = Math.abs(numObj.idx - codeObj.idx);
      if (d < bestDist){ bestDist = d; best = codeObj; }
    });
    if (best){
      changes[best.val] = (changes[best.val] || 0) + numObj.val;
      // mark used by removing from remainingCodes
      const k = remainingCodes.findIndex(c=>c.idx===best.idx); if (k>=0) remainingCodes.splice(k,1);
    }
  });

  // Any numbers not paired with a valid shortcode must be ignored. Any shortcodes not paired with a number must be ignored.

  // If no valid instruction parsed, show error
  if (Object.keys(changes).length === 0){ showError('No valid instructions parsed from input.'); return }

  // Apply changes simultaneously
  lastChange = {};
  Object.entries(changes).forEach(([code, delta]) => {
    const p = players.find(x=>x.code===code);
    if (p){ p.balance += delta; lastChange[code]=delta; }
  });

  renderBalances();
  showError('');
  el('#transaction-input').value = '';
}

// Wire up
window.addEventListener('load', ()=>{
  // initialize players defaults in setup
  players = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
  renderSetup();

  el('#start-game').addEventListener('click', ()=> startGame());
  el('#apply-transaction').addEventListener('click', ()=> applyTransaction());
  el('#reset-game').addEventListener('click', ()=> resetGame());
  el('#transaction-input').addEventListener('keydown', e=>{ if (e.key === 'Enter') { e.preventDefault(); applyTransaction(); } });
});
