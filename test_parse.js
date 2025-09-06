// test_parse.js - standalone tests for transaction parsing logic
const DEFAULT_PLAYERS = [
    { name: 'Giselle', code: 'g', balance: 1500 },
    { name: 'Mia', code: 'm', balance: 1500 },
    { name: 'Zian', code: 'z', balance: 1500 },
    { name: 'Tyrone', code: 't', balance: 1500 },
    { name: 'Stany', code: 's', balance: 1500 }
];

function parseAndApply(input, players) {
    const tokens = input.trim().split(/\s+/).filter(Boolean);
    const tokenObjs = tokens.map(t => {
        if (/^-?\d+$/.test(t)) return { type: 'num', value: Number(t) };
        if (/^[a-zA-Z]$/.test(t)) return { type: 'code', value: t.toLowerCase() };
        return { type: 'other', value: t };
    });

    const validCodes = new Set(players.map(p => p.code));
    const used = new Array(tokenObjs.length).fill(false);
    const changes = {};

    for (let i = 0; i < tokenObjs.length; i++) {
        const t = tokenObjs[i];
        if (t.type === 'code' && validCodes.has(t.value)) {
            let amount = null;
            if (i - 1 >= 0 && tokenObjs[i - 1].type === 'num' && !used[i - 1]) { amount = tokenObjs[i - 1].value; used[i - 1] = true; }
            else if (i + 1 < tokenObjs.length && tokenObjs[i + 1].type === 'num' && !used[i + 1]) { amount = tokenObjs[i + 1].value; used[i + 1] = true; }
            if (amount !== null) { changes[t.value] = (changes[t.value] || 0) + amount; }
            used[i] = true;
        }
    }

    const remainingNums = [];
    const remainingCodes = [];
    tokenObjs.forEach((t, idx) => { if (!used[idx]) { if (t.type === 'num') remainingNums.push({ idx, val: t.value }); if (t.type === 'code' && validCodes.has(t.value)) remainingCodes.push({ idx, val: t.value }); } });

    remainingNums.forEach(numObj => {
        let best = null; let bestDist = Infinity;
        remainingCodes.forEach(codeObj => {
            const d = Math.abs(numObj.idx - codeObj.idx);
            if (d < bestDist) { bestDist = d; best = codeObj; }
        });
        if (best) {
            changes[best.val] = (changes[best.val] || 0) + numObj.val;
            const k = remainingCodes.findIndex(c => c.idx === best.idx); if (k >= 0) remainingCodes.splice(k, 1);
        }
    });

    if (Object.keys(changes).length === 0) { return { error: 'No valid instructions parsed', changes: {} }; }

    // apply
    Object.entries(changes).forEach(([code, delta]) => {
        const p = players.find(x => x.code === code);
        if (p) { p.balance += delta; }
    });
    return { error: null, changes };
}

function clonePlayers() { return JSON.parse(JSON.stringify(DEFAULT_PLAYERS)); }

const tests = [
    { in: 'g 100', expect: { g: 1600 } },
    { in: '100 g', expect: { g: 1600 } },
    { in: 'z 100 g -200', expect: { z: 1600, g: 1300 } },
    { in: '100 200 g', expectError: false, note: 'Two numbers before code: nearest one should be used (200 closest?)' },
    { in: 'm', expectError: true },
    { in: '100 200', expectError: true },
    { in: 'g 100 m 50 s -20', expect: { g: 1600, m: 1550, s: 1480 } },
    { in: 'g 100 200 m', expect: false },
];

console.log('Running parse tests');
let passed = 0;
for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const ps = clonePlayers();
    const res = parseAndApply(t.in, ps);
    let ok = true;
    if (t.expectError) { ok = res.error !== null; }
    else if (t.expect) {
        Object.entries(t.expect).forEach(([code, bal]) => { const p = ps.find(x => x.code === code); if (!p || p.balance !== bal) ok = false; });
    }
    console.log(`${i + 1}. input='${t.in}' => ${res.error ? 'ERROR:' + res.error : JSON.stringify(res.changes)} => ${ok ? 'PASS' : 'FAIL'}`);
    if (ok) passed++;
}
console.log(`${passed}/${tests.length} tests passed`);
