const scheduleUrl = 'data/schedule.json';
const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfq5QpjISMxfcy_MyLpMgizaI9ERxNAhp0MjYUPdjnqbmG5fhW4gvq7JNgHhuxnpdgL9GCpTrmX4HJ/pub?gid=1997548875&single=true&output=csv';
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const shortDateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const parseDate = value => new Date(`${value}T12:00:00`);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateLabel = event => { const start = parseDate(event.date); if (!event.endDate) return dateFormat.format(start); const end = parseDate(event.endDate); return start.getMonth() === end.getMonth() ? `${shortDateFormat.format(start)}–${end.getDate()}, ${end.getFullYear()}` : `${dateFormat.format(start)}–${dateFormat.format(end)}`; };
const timeLabel = event => event.allDay ? 'All day' : event.startTime ? `${event.startTime}${event.endTime ? `–${event.endTime}` : ''}` : 'TBD';
const eventLabel = event => event.opponent ? `${event.homeAway === 'away' ? '@' : 'vs.'} ${event.opponent}` : event.event;
const eventDescription = event => `${eventLabel(event)}${event.team ? ` (${event.team})` : ''} · ${timeLabel(event)}`;
const statusClass = event => event.status === 'cancelled' ? 'cancelled' : event.conditional ? 'conditional' : event.status === 'pending' || !event.startTime ? 'pending' : '';
const badge = event => event.status === 'cancelled' ? '<span class="badge cancelled">Cancelled</span>' : event.conditional ? '<span class="badge conditional">Conditional · A Team only</span>' : event.status === 'pending' || !event.startTime ? '<span class="badge pending">Pending / TBD</span>' : '<span class="badge">Confirmed</span>';

// Supports quoted cells, embedded commas, empty values, and CRLF/LF line endings.
function parseCsv(text) {
  const rows = [[]]; let value = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { rows.at(-1).push(value); value = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      rows.at(-1).push(value); value = ''; rows.push([]);
    } else value += char;
  }
  if (quoted) throw new Error('The Google Sheet CSV has an unmatched quote.');
  if (value || rows.at(-1).length) rows.at(-1).push(value); else rows.pop();
  return rows;
}

const normalizedHeader = value => value.trim().toLowerCase().replace(/\s+/g, ' ');
const cell = (row, headers, name) => (row[headers.get(name)] || '').trim();
const yes = value => /^(yes|true|1|y)$/i.test(value);
const cleanTime = value => /^(tbd|n\/a|unknown)$/i.test(value) ? '' : value;
const dateParts = value => {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:\s+to\s+(\d{4}-\d{2}-\d{2}))?$/i);
  if (!match) throw new Error(`Invalid date "${value}" in the Google Sheet.`);
  return { date: match[1], endDate: match[2] || '' };
};
const eventId = (child, date, index) => `${child.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${date.slice(5).replace('-', '')}-${index + 1}`;

function eventsFromCsv(text) {
  const [headerRow, ...rows] = parseCsv(text);
  if (!headerRow) throw new Error('The Google Sheet CSV is empty.');
  const headers = new Map(headerRow.map((header, index) => [normalizedHeader(header), index]));
  const required = ['child', 'sport', 'date', 'event type', 'opponent / event', 'status'];
  const missing = required.filter(header => !headers.has(header));
  if (missing.length) throw new Error(`The Google Sheet CSV is missing: ${missing.join(', ')}.`);
  const events = rows.filter(row => row.some(value => value.trim())).map((row, index) => {
    const child = cell(row, headers, 'child'); const activity = cell(row, headers, 'sport').toLowerCase();
    const event = cell(row, headers, 'event type'); const opponentOrEvent = cell(row, headers, 'opponent / event');
    const { date, endDate } = dateParts(cell(row, headers, 'date'));
    if (!child || !activity || !event || !opponentOrEvent) throw new Error(`Google Sheet row ${index + 2} is missing required event information.`);
    const conditional = yes(cell(row, headers, 'conditional?')); const statusText = cell(row, headers, 'status').toLowerCase();
    if (!['confirmed', 'pending', 'conditional', 'cancelled'].includes(statusText)) throw new Error(`Google Sheet row ${index + 2} has an invalid status.`);
    const startTime = cleanTime(cell(row, headers, 'start time')); const allDay = /^all day$/i.test(startTime);
    const homeAway = cell(row, headers, 'home / away').toLowerCase(); const isGame = event.toLowerCase() === 'game';
    const normalized = {
      id: eventId(child, date, index), child, activity, date, event: isGame ? 'Game' : opponentOrEvent,
      startTime: allDay ? '' : startTime, endTime: cleanTime(cell(row, headers, 'end time')), allDay,
      location: cell(row, headers, 'location'), team: cell(row, headers, 'team / level'),
      status: statusText === 'cancelled' ? 'cancelled' : (statusText === 'pending' || statusText === 'conditional' ? 'pending' : 'confirmed'),
      conditional: conditional ? 'a-team' : '', notes: cell(row, headers, 'public notes')
    };
    if (isGame && opponentOrEvent.toLowerCase() !== 'game') normalized.opponent = opponentOrEvent;
    if (homeAway === 'home' || homeAway === 'away') normalized.homeAway = homeAway;
    if (endDate) normalized.endDate = endDate;
    return normalized;
  });
  if (!events.length) throw new Error('The Google Sheet CSV has no event rows.');
  return events;
}

function eventTable(events) { return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Event</th><th>Time</th><th>Location</th><th>Status / notes</th></tr></thead><tbody>${events.map(event => `<tr class="${statusClass(event)}"><td>${dateLabel(event)}</td><td>${escape(eventLabel(event))}${event.team ? `<br><small class="muted">${escape(event.team)}</small>` : ''}</td><td>${escape(timeLabel(event))}</td><td>${escape(event.location || 'TBD')}${event.homeAway ? `<br><small class="muted">${escape(event.homeAway)}</small>` : ''}</td><td>${badge(event)}${event.notes ? `<br>${escape(event.notes)}` : ''}${event.transportation ? `<br><small class="muted">${escape(event.transportation)}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>`; }
function dayEvents(events, date) { return events.filter(event => event.date === date || (event.endDate && event.date <= date && event.endDate >= date)); }
function conflictRows(data) { const dates = [...new Set(data.events.flatMap(event => event.endDate ? [event.date, event.endDate] : [event.date]))].sort(); return dates.map(date => { const events = dayEvents(data.events.filter(event => event.status !== 'cancelled'), date); const children = [...new Set(events.map(event => event.child))]; const note = data.conflictNotes[date]; if (children.length < 2 && !note) return ''; const major = note?.severity === 'critical'; const potential = events.some(event => event.conditional || event.status === 'pending') || note?.severity === 'potential'; return `<tr class="${major ? 'critical' : potential ? 'pending' : ''}"><td>${shortDateFormat.format(parseDate(date))}</td><td>${children.map(child => `<strong>${escape(child)}:</strong> ${escape(events.filter(event => event.child === child).map(eventDescription).join('; '))}`).join('<br>')}</td><td>${escape(note?.text || (major ? 'Multiple family activities need coordination.' : 'Overlapping family activities may require coordination.'))}</td></tr>`; }).filter(Boolean).join(''); }
function render(data, source) { document.querySelector('#hero-copy').textContent = data.site.description; document.querySelector('#source-status').innerHTML = source.live ? '<span class="source-status live">Source: Live Google Sheet</span>' : '<span class="source-status fallback">Source: Local fallback — it may not reflect the latest spreadsheet edits.</span>'; const eventsFor = child => data.events.filter(event => event.child === child).sort((a,b) => a.date.localeCompare(b.date)); const profiles = Object.entries(data.children).map(([name, child]) => `<article class="card"><div class="eyebrow">${escape(name)}</div><h3>${escape(child.activity)}</h3><p class="muted">${escape(child.summary)}</p><span class="tag">${escape(child.tag)}</span></article>`).join(''); document.querySelector('#schedule-app').innerHTML = `<section id="overview"><div class="section-head"><h2>Current status</h2><p>Known information, remaining unknowns, and the assumptions currently in use.</p></div><div class="grid">${profiles}</div><div class="note"><strong>Tala transportation:</strong> ${escape(data.transportation.tala)}</div></section>${Object.entries(data.children).map(([name, child]) => `<section id="${name.toLowerCase()}"><div class="section-head"><h2>${escape(name)} — ${escape(child.activity)}</h2><p>${escape(child.sectionDescription)}</p></div>${name === 'Tala' ? '<div class="legend"><span class="conditional">Conditional — A Team only</span></div>' : ''}${name === 'Kal' ? '<div class="legend"><span class="pending">Pending exact game time</span></div>' : ''}${eventTable(eventsFor(name))}${child.note ? `<div class="note">${escape(child.note)}</div>` : ''}</section>`).join('')}<section id="conflicts"><div class="section-head"><h2>Family scheduling pressure points</h2><p>Derived from the event data; highlighted dates may need split transportation or advance coordination.</p></div><div class="legend"><span class="critical">Major conflict</span><span class="pending">Potential / unresolved conflict</span></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Activities</th><th>Logistics flag</th></tr></thead><tbody>${conflictRows(data) || '<tr><td colspan="3">No current multi-child pressure points.</td></tr>'}</tbody></table></div><div class="actions"><span class="muted">Schedule data last updated: ${escape(data.site.lastUpdated)}.</span><button type="button" onclick="window.print()">Print / Save PDF</button></div></section>`; }

async function loadSchedule(fetcher = fetch) {
  const fallbackResponse = await fetcher(scheduleUrl, { cache: 'no-cache' });
  if (!fallbackResponse.ok) throw new Error(`Local schedule data could not load (${fallbackResponse.status}).`);
  const fallback = await fallbackResponse.json();
  try {
    const response = await fetcher(`${googleSheetUrl}&refresh=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Google Sheet returned ${response.status}.`);
    return { data: { ...fallback, events: eventsFromCsv(await response.text()) }, source: { live: true } };
  } catch (error) {
    console.warn('Using local schedule fallback:', error);
    return { data: fallback, source: { live: false } };
  }
}

loadSchedule().then(({ data, source }) => render(data, source)).catch(error => { document.querySelector('#schedule-app').innerHTML = `<section><div class="section-head"><h2>Schedule unavailable</h2><p>${escape(error.message)}. Please refresh or check the local schedule data file.</p></div></section>`; console.error(error); });
