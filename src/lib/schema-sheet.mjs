// Reads the schedule from the Google Sheet tab "Hemsida schema" (published as CSV).
// Shared by the build (src/lib/data.ts) and the admin page (netlify/functions/schema-admin.mjs),
// so the preview on /admin/schema/ shows exactly what the next build will publish.
//
// How the tab is laid out (the school's own format, kept as it is):
// - Column pairs A/B, D/E, G/H (C and F are empty dividers), each a column of groups.
// - A group heading is text in the left column with nothing to its right ("DANS FÖR 2-5 ÅR").
// - A day is a weekday in the left column ("MÅNDAG").
// - A class is a time in the left column and the class name in the right ("16.00-16.30" | "Dansmix 2-3 år").
// - A row with only "TÄVLINGSDANS" starts the competition schedule; everything below it belongs there.

/** Published CSV of the tab "Hemsida schema". Change here if the sheet is ever replaced. */
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhRLftFqzyfdqgRRAgdO8d5wj2PC2Gj_UbB6G7bqOTEobF8K8PpJMFnUn8MV3VIwMyHsiZk4ts6dk5/pub?gid=50353763&single=true&output=csv';

/** Link for staff who want to open the sheet itself (the published view, not the edit view). */
export const SHEET_VIEW_URL = SHEET_CSV_URL.replace('output=csv', 'output=html');

const DAYS = ['Måndagar', 'Tisdagar', 'Onsdagar', 'Torsdagar', 'Fredagar', 'Lördagar', 'Söndagar'];
const COMPETITION_MARKER = 'TÄVLINGSDANS';
const TIME = /^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})$/;

/** Minimal RFC 4180 CSV parser (quoted cells may contain commas, quotes and line breaks). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const cellRef = (col, row) => `${String.fromCharCode(65 + col)}${row + 1}`;

function dayName(s) {
  const key = s.toLowerCase().replace(/ar$/, '');
  return DAYS.find((d) => d.toLowerCase().replace(/ar$/, '') === key);
}

/** "DANS FÖR 2-5 ÅR" → "Dans för 2-5 år". Words with lower-case letters are kept as written. */
function headingName(s) {
  const words = s.split(' ').map((w) => (w === w.toUpperCase() ? w.toLowerCase() : w));
  const joined = words.join(' ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** "16.00-16:30" → "16.00-16.30" (one way of writing times on the whole site). */
function timeText(s) {
  const m = s.match(TIME);
  return m ? `${m[1].padStart(2, '0')}.${m[2]}-${m[3].padStart(2, '0')}.${m[4]}` : null;
}

/**
 * Turns the CSV rows into the schedule structure used by the site.
 * @returns {{ veckoschema: Grupp[], tavlingsschema: Grupp[], fel: string[] }}
 * @typedef {{ namn: string, dagar: { dag: string, pass: { tid: string, klass: string }[] }[] }} Grupp
 */
export function parseSchedule(rows) {
  const fel = [];
  const sections = { veckoschema: [], tavlingsschema: [] };
  let section = 'veckoschema';
  // Each column pair keeps track of its current group and day.
  let columns = new Map();

  rows.forEach((cells, r) => {
    const filled = cells.map(clean).filter(Boolean);
    if (filled.length === 1 && filled[0].toUpperCase() === COMPETITION_MARKER) {
      section = 'tavlingsschema';
      columns = new Map();
      return;
    }
    for (let c = 0; c < cells.length; c += 3) {
      const left = clean(cells[c]);
      const right = clean(cells[c + 1]);
      if (!left && !right) continue;
      const at = cellRef(c, r);
      const state = columns.get(c) ?? {};
      columns.set(c, state);

      if (!left) {
        fel.push(`${cellRef(c + 1, r)}: klassen "${right}" saknar tid i ${at}.`);
      } else if (dayName(left) && !right) {
        if (!state.grupp) fel.push(`${at}: dagen "${left}" står innan någon grupprubrik i den här kolumnen.`);
        else {
          state.dag = { dag: dayName(left), pass: [] };
          state.grupp.dagar.push(state.dag);
        }
      } else if (TIME.test(left)) {
        if (!right) fel.push(`${at}: tiden ${left} saknar klass i ${cellRef(c + 1, r)}.`);
        else if (!state.dag) fel.push(`${at}: passet "${right}" står innan någon veckodag i den här kolumnen.`);
        else state.dag.pass.push({ tid: timeText(left), klass: right });
      } else if (!right) {
        state.grupp = { namn: headingName(left), dagar: [] };
        state.dag = undefined;
        sections[section].push(state.grupp);
      } else {
        fel.push(`${at}: "${left}" ser inte ut som en tid (skriv till exempel 16.00-16.45). Klassen är "${right}".`);
      }
    }
  });

  for (const [key, label] of [['veckoschema', 'Veckoschemat'], ['tavlingsschema', 'Tävlingsschemat']]) {
    const grupper = sections[key];
    if (!grupper.length) fel.push(`${label} är tomt.${key === 'tavlingsschema' ? ` Raden "${COMPETITION_MARKER}" saknas eller har ändrats.` : ''}`);
    for (const g of grupper) {
      const pass = g.dagar.reduce((n, d) => n + d.pass.length, 0);
      if (!pass) fel.push(`${label}: gruppen "${g.namn}" har inga pass. Är det en felskrivning, eller ska rubriken tas bort?`);
      for (const d of g.dagar) {
        if (!d.pass.length) fel.push(`${label}: "${g.namn}" har ${d.dag.toLowerCase()} utan några pass.`);
      }
    }
  }
  return { ...sections, fel };
}

/**
 * Fetches and parses the sheet. Throws if Google does not answer;
 * parse problems are returned in `fel` instead.
 */
export async function fetchSchedule(url = SHEET_CSV_URL, { timeoutMs = 15000 } = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  if (!res.ok) throw new Error(`Google svarade ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('csv')) throw new Error(`Google skickade inte en CSV-fil (${type || 'okänd typ'}). Är fliken fortfarande publicerad?`);
  return parseSchedule(parseCsv(await res.text()));
}

/** Flat list of "Section › Group › Day › time class" lines, for showing what changed. */
export function scheduleLines(schedule) {
  const lines = [];
  for (const [key, label] of [['veckoschema', 'Vecka'], ['tavlingsschema', 'Tävling']]) {
    for (const g of schedule[key] ?? []) {
      for (const d of g.dagar) for (const p of d.pass) lines.push(`${label} › ${g.namn} › ${d.dag} › ${p.tid} ${p.klass}`);
    }
  }
  return lines;
}
