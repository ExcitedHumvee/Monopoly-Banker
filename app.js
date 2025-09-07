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
let history = []; // array of { input, changes }

const el = selector => document.querySelector(selector);

function renderSetup() {
    const list = el('#players-list');
    list.innerHTML = '';
    players.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'player-row';
        // (hamburger removed) row not draggable
        row.dataset.index = i;
        row.innerHTML = `
                                <input data-index="${i}" class="player-name" type="text" value="${escapeHtml(p.name)}" />
                                <input data-index="${i}" class="player-code" type="text" maxlength="1" value="${escapeHtml(p.code)}" />
                                <input data-index="${i}" class="player-balance" type="number" value="${p.balance}" />
                                <button class="delete-row" aria-label="Delete player">✖</button>
                                <div class="mobile-move">
                                    <button class="move-btn move-up" data-index="${i}" title="Move up">▲</button>
                                    <button class="move-btn move-down" data-index="${i}" title="Move down">▼</button>
                                </div>
                        `;
        list.appendChild(row);
    });

    // attach handlers for move/delete buttons
    list.querySelectorAll('.player-row').forEach(row => {
        const up = row.querySelector('.move-up');
        const down = row.querySelector('.move-down');
        if (up) up.addEventListener('click', e => { e.preventDefault(); const idx = Number(row.dataset.index); moveRow(idx, idx - 1); });
        if (down) down.addEventListener('click', e => { e.preventDefault(); const idx = Number(row.dataset.index); moveRow(idx, idx + 1); });
        // delete button handler
        const del = row.querySelector('.delete-row');
        if (del) del.addEventListener('click', e => { e.preventDefault(); const idx = Number(row.dataset.index); if (!isNaN(idx)) { players.splice(idx, 1); renderSetup(); } });
    });
}
var dragSrcIndex = null;
var lastPointer = null;

// moveRow exported at top-level so button handlers can call it
function moveRow(from, to) {
    if (from === to) return;
    if (to < 0) to = 0;
    if (to >= players.length) to = players.length - 1;
    const item = players.splice(from, 1)[0];
    players.splice(to, 0, item);
    renderSetup();
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

function startGame() {
    // Read values from inputs and normalize
    const names = Array.from(document.querySelectorAll('.player-name')).map(i => i.value.trim() || '');
    const codes = Array.from(document.querySelectorAll('.player-code')).map(i => (i.value || '').trim().toLowerCase());
    const balances = Array.from(document.querySelectorAll('.player-balance')).map(i => Number(i.value) || 0);

    // validate uniqueness of shortcodes and non-empty
    const codeSet = new Set();
    for (let i = 0; i < codes.length; i++) {
        if (!codes[i] || codes[i].length !== 1) return showError('Each player must have a single-character shortcode.');
        if (codeSet.has(codes[i])) return showError('Player shortcodes must be unique.');
        codeSet.add(codes[i]);
    }
    // validate uniqueness of names (non-empty)
    const nameSet = new Set();
    for (let i = 0; i < names.length; i++) {
        if (!names[i]) return showError('Each player must have a name.');
        const n = names[i].toLowerCase();
        if (nameSet.has(n)) return showError('Player names must be unique.');
        nameSet.add(n);
    }

    // Build players array from current inputs and preserve additional players
    players = names.map((name, i) => ({ name: name || '', code: codes[i], balance: balances[i] }));
    // Do not force-sort the players array; keep the user's defined order. We'll render balances with defaults first, then extras.

    el('#setup').hidden = true;
    el('#game').hidden = false;
    renderBalances();
    showError('');
}

function resetGame() {
    // Return to setup populated with current players (do not overwrite with defaults)
    lastChange = {};
    el('#setup').hidden = false;
    el('#game').hidden = true;
    // Keep current `players` array so the setup form shows current details
    renderSetup();
    showError('');
}

function renderBalances() {
    const list = el('#balances');
    list.innerHTML = '';
    // Must always display in the order Giselle, Mia, Zian, Tyrone, Stany
    const order = ['g', 'm', 'z', 't', 's'];
    // First render default-order players
    order.forEach(code => {
        const p = players.find(x => x.code === code);
        if (!p) return; // skip if missing
        const li = document.createElement('li');
        li.className = 'balance-item';
    const name = document.createElement('div');
    name.className = 'player-name';
    name.innerHTML = `<span class="player-name-text">${escapeHtml(p.name)}</span> <span class="player-code-text">(${escapeHtml(p.code)})</span>`;
    const bal = document.createElement('div');
    bal.className = 'current-balance-wrapper';
    const delta = lastChange[code];
    const changeHtml = (delta !== undefined && delta !== 0) ? `<span class="balance-change ${delta > 0 ? 'change-positive' : 'change-negative'}">(${delta > 0 ? '+' : '-'}$${Math.abs(delta)})</span>` : '';
    bal.innerHTML = `<span class="current-balance">$${p.balance.toLocaleString()}</span> ${changeHtml}`;
        if (delta !== undefined && delta !== 0) li.classList.add('changed');
        li.appendChild(name);
        li.appendChild(bal);
        list.appendChild(li);
    });
    // Then render any extra players added by the user (those with codes not in the default order)
    players.forEach(p => {
        if (order.includes(p.code)) return;
        const li = document.createElement('li');
        li.className = 'balance-item';
    const name = document.createElement('div');
    name.className = 'player-name';
    name.innerHTML = `<span class="player-name-text">${escapeHtml(p.name || '(unnamed)')}</span> <span class="player-code-text">(${escapeHtml(p.code)})</span>`;
    const bal = document.createElement('div');
    bal.className = 'current-balance-wrapper';
    const delta2 = lastChange[p.code];
    const changeHtml2 = (delta2 !== undefined && delta2 !== 0) ? `<span class="balance-change ${delta2 > 0 ? 'change-positive' : 'change-negative'}">(${delta2 > 0 ? '+' : '-'}$${Math.abs(delta2)})</span>` : '';
    bal.innerHTML = `<span class="current-balance">$${p.balance.toLocaleString()}</span> ${changeHtml2}`;
        if (delta2 !== undefined && delta2 !== 0) li.classList.add('changed');
        li.appendChild(name);
        li.appendChild(bal);
        list.appendChild(li);
    });
}

function showError(msg) { el('#error').textContent = msg || ''; }

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
    const validCodes = new Set(players.map(p => p.code));

    // Walk tokens and pair numbers with nearest valid code (either side). Each token can be used only once.
    const used = new Array(tokenObjs.length).fill(false);
    const changes = {}; // code -> cumulative change for this line

    for (let i = 0; i < tokenObjs.length; i++) {
        const t = tokenObjs[i];
        if (t.type === 'code' && validCodes.has(t.value)) {
            // try find a number immediately before or after (prefer immediate neighbor)
            let amount = null;
            // check previous
            if (i - 1 >= 0 && tokenObjs[i - 1].type === 'num' && !used[i - 1]) amount = tokenObjs[i - 1].value, used[i - 1] = true;
            // else check next
            else if (i + 1 < tokenObjs.length && tokenObjs[i + 1].type === 'num' && !used[i + 1]) amount = tokenObjs[i + 1].value, used[i + 1] = true;
            if (amount !== null) {
                changes[t.value] = (changes[t.value] || 0) + amount;
            }
            used[i] = true;
        }
    }

    // Also handle numbers followed by codes where code was not directly adjacent but number is nearer to that code than another? The spec: "A number is always associated with the nearest valid player shortcode, whether it appears immediately before or after it." The earlier loop handles immediate neighbors; for non-immediate we must pair remaining nums to nearest code by distance.
    // Collect remaining unused numbers and codes
    const remainingNums = [];
    const remainingCodes = [];
    tokenObjs.forEach((t, idx) => { if (!used[idx]) { if (t.type === 'num') remainingNums.push({ idx, val: t.value }); if (t.type === 'code' && validCodes.has(t.value)) remainingCodes.push({ idx, val: t.value }); } });

    remainingNums.forEach(numObj => {
        // find nearest code token index
        let best = null; let bestDist = Infinity;
        remainingCodes.forEach(codeObj => {
            const d = Math.abs(numObj.idx - codeObj.idx);
            if (d < bestDist) { bestDist = d; best = codeObj; }
        });
        if (best) {
            changes[best.val] = (changes[best.val] || 0) + numObj.val;
            // mark used by removing from remainingCodes
            const k = remainingCodes.findIndex(c => c.idx === best.idx); if (k >= 0) remainingCodes.splice(k, 1);
        }
    });

    // Any numbers not paired with a valid shortcode must be ignored. Any shortcodes not paired with a number must be ignored.

    // If no valid instruction parsed, show error
    if (Object.keys(changes).length === 0) { showError('No valid instructions parsed from input.'); return }

    // Apply changes simultaneously
    lastChange = {};
    Object.entries(changes).forEach(([code, delta]) => {
        const p = players.find(x => x.code === code);
        if (p) { p.balance += delta; lastChange[code] = delta; }
    });

    // record history entry for this transaction
    history.push({ input, changes: { ...lastChange } });

    renderBalances();
    showError('');
    el('#transaction-input').value = '';
}

// Wire up
window.addEventListener('load', () => {
    // initialize players defaults in setup
    players = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
    renderSetup();

    el('#start-game').addEventListener('click', () => startGame());
    const addBtn = el('#add-player');
    if (addBtn) addBtn.addEventListener('click', () => {
        // generate a unique single-letter shortcode if possible
        const used = new Set(players.map(p => p.code));
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        let code = null;
        for (let ch of letters) { if (!used.has(ch)) { code = ch; break; } }
        if (!code) {
            // fallback: use 'p' + next number
            code = 'p' + (players.length + 1);
        }
        players.push({ name: '', code: code, balance: 1500 });
        renderSetup();
    });
    el('#apply-transaction').addEventListener('click', () => applyTransaction());
    // history and undo handlers (history modal elements added in index.html)
    const historyBtn = el('#history-button');
    if (historyBtn) historyBtn.addEventListener('click', showHistory);
    const closeHistory = el('#close-history');
    if (closeHistory) closeHistory.addEventListener('click', () => el('#history-modal').hidden = true);
    // ensure modal is hidden by default
    const modal = el('#history-modal'); if (modal) modal.hidden = true;
    // clicking on backdrop closes modal
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
    const goBack = el('#go-back');
    if (goBack) goBack.addEventListener('click', undoLastTransaction);
    el('#reset-game').addEventListener('click', () => resetGame());
    el('#transaction-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyTransaction(); } });
});

function showHistory() {
    const modal = el('#history-modal');
    const list = el('#history-list');
    list.innerHTML = '';
    if (!history.length) {
        list.innerHTML = '<li><em>No transactions yet</em></li>';
    } else {
        history.slice().reverse().forEach(h => {
            const li = document.createElement('li');
            const effects = Object.entries(h.changes).map(([c, d]) => `${c} ${d > 0 ? '+' : ''}${d}`).join(', ');
            li.textContent = `${h.input} => ${effects}`;
            list.appendChild(li);
        });
    }
    modal.hidden = false;
}

function undoLastTransaction() {
    if (!history.length) { showError('No transaction to undo.'); return }
    const last = history.pop();
    Object.entries(last.changes).forEach(([code, delta]) => {
        const p = players.find(x => x.code === code);
        if (p) p.balance -= delta;
    });
    lastChange = {};
    renderBalances();
    showError('Last transaction undone.');
}
