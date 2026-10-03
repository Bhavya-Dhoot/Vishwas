const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const ui = { tab: 'overview', patientId: null, episodeId: null, role: null, showIntake: false, search: '', departmentFilter: '', busy: false, drafts: {} };
let data;
let session;
let directory = { departments: [], specialists: [], slots: [] };
let connector = null;
let toastTimer;

function clearWorkspace() {
  data = null;
  connector = null;
  Object.assign(ui, { role: null, patientId: null, episodeId: null, tab: 'overview', drafts: {}, search: '', departmentFilter: '', showIntake: false });
}

function renderLanding() {
  app.innerHTML = `<main class="landing"><header class="landing-header"><div class="brand"><div class="brand-mark">✳</div><div><strong>vishwas</strong><span>Care coordination</span></div></div><span class="demo-badge">${session?.mode === 'demo' ? 'PUBLIC DEMO' : 'PROTECTED WORKSPACE'} · SYNTHETIC DATA</span></header><div class="landing-grid"><section>${renderPreArrivalStart()}</section><aside class="landing-aside card"><div class="eyebrow">CARE COORDINATOR</div><h2>A clear next step.<br>At every visit.</h2><p>Review referral requests, arrange appointments, and help patients return for follow-up.</p>${session?.mode === 'demo' ? `<button type="button" class="button primary full" data-command="demo-staff">Enter staff demo →</button><div class="divider"></div><div class="eyebrow">EXPLORE A FICTIONAL JOURNEY</div><p>Each example opens a separate patient session.</p><button type="button" class="button secondary full" data-demo-patient="patient_routing">Referral awaiting review</button><button type="button" class="button secondary full" data-demo-patient="patient_booked">Appointment ready</button><button type="button" class="button secondary full" data-demo-patient="patient_followup">Follow-up journey</button>` : `<form data-form="staff_login">${session?.staffLogin === 'named' ? '<label>Username<input name="username" autocomplete="username" required></label>' : ''}<label>Staff password<input type="password" name="password" autocomplete="current-password" required></label><button class="button primary full" type="submit">Sign in as staff →</button></form>`}<p class="landing-footnote">Fictional records only. WhatsApp and ABHA are simulated. No real care request is sent.</p></aside></div></main>`;
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const day = value => value ? new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
const stamp = value => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';
const title = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const patientById = id => data.patients.find(patient => patient.id === id);
const episodeById = id => data.episodes.find(episode => episode.id === id);
const departmentById = id => data.departments.find(department => department.id === id);
const slotById = id => data.slots.find(slot => slot.id === id);
const specialistById = id => data.specialists.find(specialist => specialist.id === id);
const patientEpisodes = id => data.episodes.filter(episode => episode.patientId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const openEpisodes = () => data.episodes.filter(episode => episode.status !== 'completed');
const currentPatient = () => patientById(ui.patientId);
const currentEpisode = () => episodeById(ui.episodeId);
const opted = value => value ? 'Yes' : 'No';
const icon = name => ({ overview: '◫', journeys: '◎', inbox: '▤' })[name];

function notice(message, error = false) {
  toast.textContent = message;
  toast.className = `toast show ${error ? 'error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 4300);
}

async function load(successMessage) {
  try {
    const directoryResponse = await fetch('/api/directory');
    if (directoryResponse.ok) directory = await directoryResponse.json();
    const sessionResponse = await fetch('/api/session');
    session = await sessionResponse.json();
    if (!sessionResponse.ok) throw Error(session.error || 'Unable to check your session.');
    if (!session.authenticated) { clearWorkspace(); renderLanding(); return; }
    ui.role = session.role;
    ui.tab = ui.role === 'patient' ? (ui.tab === 'inbox' ? 'inbox' : 'journeys') : (ui.tab === 'journeys' || ui.tab === 'inbox' ? ui.tab : 'overview');
    ui.patientId = ui.role === 'patient' ? session.patientId : ui.patientId;
    const response = await fetch('/api/state');
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Unable to load the workspace.');
    data = result;
    directory = { departments: data.departments, specialists: data.specialists, slots: data.slots };
    if (ui.role === 'staff') {
      const connectorResponse = await fetch('/api/connector/status');
      connector = connectorResponse.ok ? await connectorResponse.json() : null;
    }
    if (ui.role === 'patient' && ui.patientId) ui.episodeId = patientEpisodes(ui.patientId).find(episode => episode.status !== 'completed')?.id || patientEpisodes(ui.patientId)[0]?.id || null;
    reconcileSelection();
    render();
    if (successMessage) notice(successMessage);
  } catch (error) {
    clearWorkspace();
    app.innerHTML = `<main class="load-error"><div class="mark">✳</div><h1>Workspace unavailable</h1><p>${esc(error.message)}</p><button class="button primary" type="button" data-command="retry">Try again</button></main>`;
  }
}

function reconcileSelection() {
  if (!data.patients.some(patient => patient.id === ui.patientId)) {
    if (ui.role === 'patient') ui.patientId = null;
    else ui.patientId = data.patients[0]?.id || null;
  }
  if (!patientEpisodes(ui.patientId).some(episode => episode.id === ui.episodeId)) ui.episodeId = patientEpisodes(ui.patientId)[0]?.id || null;
}

async function sessionAction(path, payload = {}, successMessage) {
  if (ui.busy) return;
  ui.busy = true;
  const controls = [...document.querySelectorAll('button, input, select, textarea')];
  controls.forEach(control => { control.disabled = true; });
  try {
    const response = await fetch(`/api/session/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.csrfToken ? { 'x-csrf-token': session.csrfToken } : {}) }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 403 || (response.status === 401 && path !== 'login')) { clearWorkspace(); await load(); }
      throw Error(result.error || 'Unable to start the session.');
    }
    clearWorkspace();
    session = result.session || result;
    ui.patientId = session.role === 'patient' ? session.patientId : null;
    ui.episodeId = result.result?.episodeId || null;
    ui.tab = session.role === 'patient' ? 'journeys' : 'overview';
    ui.showIntake = false;
    ui.drafts = {};
    window.history.replaceState({}, '', '/');
    await load(successMessage);
  } catch (error) {
    if (path === 'logout') { clearWorkspace(); app.innerHTML = `<main class="load-error"><h1>Workspace cleared</h1><p>Sign-out could not be confirmed. Retry to end the server session.</p><button class="button primary" data-command="logout">Retry sign out</button></main>`; }
    controls.forEach(control => { control.disabled = false; });
    notice(error.message, true);
  } finally { ui.busy = false; }
}

function preserveFocus() {
  const active = document.activeElement;
  if (!active?.matches?.('textarea') && !active?.dataset?.draft) return null;
  return { draft: active.dataset.draft, form: active.closest('[data-form]')?.dataset.form, name: active.name, start: active.selectionStart, end: active.selectionEnd };
}

function restoreFocus(focus) {
  if (!focus) return;
  const field = focus.draft ? [...document.querySelectorAll('[data-draft]')].find(el => el.dataset.draft === focus.draft) : [...document.querySelectorAll('textarea')].find(el => el.name === focus.name && el.closest('[data-form]')?.dataset.form === focus.form);
  if (!field) return;
  field.focus();
  if (typeof focus.start === 'number' && typeof field.setSelectionRange === 'function') field.setSelectionRange(focus.start, focus.end);
}

function captureForms() {
  return [...document.querySelectorAll('[data-form]')].map(form => ({
    name: form.dataset.form, inquiry: form.dataset.inquiry,
    fields: [...form.elements].filter(field => field.name && field.type !== 'file').map(field => ({ name: field.name, value: field.value, checked: field.checked }))
  }));
}

function restoreForms(saved, exclude) {
  for (const entry of saved) {
    if (entry.name === exclude) continue;
    const form = [...document.querySelectorAll('[data-form]')].find(node => node.dataset.form === entry.name && node.dataset.inquiry === entry.inquiry);
    if (!form) continue;
    for (const field of entry.fields) {
      const control = [...form.elements].find(node => node.name === field.name);
      if (control) { control.value = field.value; if (control.type === 'checkbox') control.checked = field.checked; }
    }
  }
}

async function action(type, payload = {}, success = 'Saved') {
  if (ui.busy) return;
  const focus = preserveFocus();
  const forms = captureForms();
  ui.busy = true;
  document.querySelectorAll('button, input, select, textarea').forEach(control => { if (control.dataset.command !== 'retry') control.disabled = true; });
  try {
    const response = await fetch('/api/actions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken }, body: JSON.stringify({ type, payload }) });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearWorkspace();
        await load();
        notice('Your access changed. Please retry from your current session.', true);
        return;
      }
      throw Error(result.error || 'The action could not be completed.');
    }
    data = result;
    if (type === 'create_patient') {
      ui.patientId = result.result?.patientId;
      ui.episodeId = result.result?.episodeId;
      ui.showIntake = false;
      ui.tab = 'journeys';
      ui.invalidLink = false;
      if (ui.role === 'patient' && ui.patientId) window.history.replaceState({}, '', `/?view=patient&patient=${encodeURIComponent(ui.patientId)}`);
    }
    if (type === 'complete_visit' && result.result?.episodeId) ui.episodeId = result.result.episodeId;
    if (type === 'reset_demo') { ui.patientId = null; ui.episodeId = null; ui.tab = 'overview'; ui.drafts = {}; }
    reconcileSelection();
    render();
    restoreForms(forms, type);
    if (focus?.form !== type) restoreFocus(focus);
    notice(type === 'accept_inquiry' ? ({ booked: 'Appointment booked', waitlisted: 'Waitlisted — no matching slot yet', awaiting_staff_scheduling: 'Accepted — staff scheduling required' })[result.result?.status] || success : success);
  } catch (error) {
    render();
    restoreForms(forms);
    restoreFocus(focus);
    notice(error.message, true);
  } finally { ui.busy = false; }
}

async function postApi(path, payload, success) {
  if (ui.busy) return;
  ui.busy = true;
  const controls = [...document.querySelectorAll('button, input, select, textarea')].map(control => ({ control, disabled: control.disabled }));
  controls.forEach(({ control }) => { control.disabled = true; });
  try {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': session.csrfToken }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) { clearWorkspace(); await load(); }
      throw Error(result.error || 'Request could not be completed.');
    }
    if (path.endsWith('/verify')) {
      notice(result.message || (result.verified ? 'File integrity verified' : 'Verification unavailable'), !result.verified);
    } else {
      await load(typeof success === 'function' ? success(result) : success);
    }
  } catch (error) {
    notice(error.message, true);
  } finally {
    ui.busy = false;
    controls.forEach(({ control, disabled }) => { if (control.isConnected) control.disabled = disabled; });
  }
}

async function uploadDocument(form) {
  const file = form.elements.file.files[0];
  if (!file || file.size < 1 || file.size > 2 * 1024 * 1024) { notice('Choose a file from 1 byte to 2 MB.', true); return; }
  const extension = file.name.split('.').pop().toLowerCase();
  const mimeType = ({ pdf: 'application/pdf', txt: 'text/plain', json: 'application/json' })[extension];
  if (!mimeType) { notice('Choose a PDF, text or JSON file.', true); return; }
  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
  await postApi('/api/documents', { patientId: ui.patientId, name: file.name, mimeType, contentBase64, ledgerConsent: form.elements.ledgerConsent.checked }, result => result.document?.anchorStatus === 'anchor_failed' ? 'File saved; Fabric anchor unavailable' : 'Document saved');
}

function render() {
  const selected = currentPatient();
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar" aria-label="Main navigation">
        <div class="brand"><div class="brand-mark" aria-hidden="true">✳</div><div><strong>vishwas</strong><span>Care coordination</span></div></div>
        <div class="side-section-label">WORKSPACE</div>
        <nav class="nav ${ui.role === 'patient' ? ui.patientId ? 'patient-nav' : 'patient-nav single' : ''}" aria-label="Workspace views">
          ${(ui.role === 'patient' ? (ui.patientId ? ['journeys', 'inbox'] : ['journeys']) : ['overview', 'journeys', 'inbox']).map(tab => `<button type="button" data-nav="${tab}" class="nav-link ${ui.tab === tab ? 'active' : ''}" aria-current="${ui.tab === tab ? 'page' : 'false'}"><span class="nav-icon" aria-hidden="true">${icon(tab)}</span>${ui.role === 'patient' ? { journeys: 'My journey', inbox: 'Messages' }[tab] : { overview: 'Overview', journeys: 'Patient journeys', inbox: 'Care inbox' }[tab]}${ui.role === 'staff' && tab === 'inbox' && data.episodes.filter(ep => ep.needsHelp || ['department_inquiry', 'coordination_inquiry', 'ready_to_book', 'waitlisted'].includes(ep.status)).length ? `<span class="nav-count">${data.episodes.filter(ep => ep.needsHelp || ['department_inquiry', 'coordination_inquiry', 'ready_to_book', 'waitlisted'].includes(ep.status)).length}</span>` : ''}</button>`).join('')}
        </nav>
        <div class="side-bottom"><div class="prototype-label"><span class="live-dot"></span>Synthetic-data prototype</div><p>WhatsApp and ABHA are simulated</p><div class="role-label">${session.mode === 'demo' ? 'DEMO SESSION' : 'PROTECTED SESSION'}</div><p>${esc(session.actor || title(session.role))}</p><button type="button" class="button secondary full" data-command="logout">Sign out / change session</button></div>
      </aside>
      <div class="main-column">
        <header class="topbar"><div class="mobile-brand"><span class="brand-mark">✳</span><strong>vishwas</strong></div><div class="breadcrumb">${ui.role === 'patient' ? 'My care journey' : 'Workspace'} <span>/</span> <strong>${ui.role === 'patient' ? { journeys: 'My journey', inbox: 'Messages' }[ui.tab] : { overview: 'Overview', journeys: 'Patient journeys', inbox: 'Care inbox' }[ui.tab]}</strong></div><div class="top-actions"><span class="today-pill"><span class="live-dot"></span>${session.mode === 'demo' ? 'Demo day' : 'Today'} · ${day(data.today)}</span>${ui.role === 'staff' && session.mode === 'demo' ? '<button type="button" class="text-button" data-command="demo-tools">Demo controls <span aria-hidden="true">⌄</span></button>' : ''}<button type="button" class="text-button session-exit" data-command="logout">Sign out</button></div></header>
        <main id="main" tabindex="-1">${ui.tab === 'overview' ? renderOverview() : ui.tab === 'journeys' ? renderJourneys() : renderInbox()}</main>
      </div>
    </div>
    ${ui.role === 'staff' && session.mode === 'demo' ? `<dialog id="reset-dialog" class="dialog"><form method="dialog"><div class="dialog-icon">↺</div><h2>Reset the demo?</h2><p>This restores the original three fictional patients and removes all changes made in this local demo.</p><div class="dialog-actions"><button class="button secondary" value="cancel">Keep workspace</button><button class="button danger" value="confirm">Reset demo</button></div></form></dialog>
    <dialog id="tools-dialog" class="dialog tools-dialog"><form method="dialog"><div class="dialog-head"><div><div class="eyebrow">DEMO CONTROLS</div><h2>Move the simulation forward</h2></div><button class="icon-button" value="cancel" aria-label="Close demo controls">×</button></div><p>The date changes what is due. Reminders are generated only when you run them.</p><label for="demo-date">Simulated day</label><div class="inline-form"><input id="demo-date" type="date" value="${esc(data.today)}" min="2026-01-01"><button type="button" class="button primary" data-command="set-date">Set date</button></div><div class="tool-actions"><button type="button" class="button secondary" data-command="run-reminders">Run reminders</button><button type="button" class="button subtle-danger" data-command="reset">Reset demo data</button></div></form></dialog>` : ''}`;
  if (!selected && ui.tab !== 'overview') app.querySelector('.main-content')?.focus();
}

function sectionHead(kicker, heading, description = '') { return `<div class="section-head"><div><div class="eyebrow">${kicker}</div><h2>${heading}</h2>${description ? `<p>${description}</p>` : ''}</div></div>`; }
function metricCard(label, value, note, tone = '') { return `<div class="metric-card ${tone}"><span>${label}</span><strong>${value ?? '—'}</strong><small>${note}</small></div>`; }
function statusLabel(ep) { return ({ needs_route: 'Needs route', coordination_inquiry: 'Coordination review', department_inquiry: 'Department inquiry', ready_to_book: 'Ready to book', awaiting_staff_scheduling: 'Staff scheduling', waitlisted: 'Waitlisted', booked: 'Booked', checked_in: 'Checked in', completed: 'Completed' })[ep.status] || title(ep.status); }
function statusPill(ep) { return `<span class="status status-${esc(ep.status)}"><span class="status-dot"></span>${statusLabel(ep)}</span>`; }
function schedulingNote(ep) {
  if (ep.status === 'waitlisted') return ep.waitlistReason === 'patient_preferences'
    ? 'Available appointments do not match the requested date, time or specialist. Staff can retry when new slots appear.'
    : 'No available specialist and slot match this department and language. Staff can retry when capacity changes.';
  if (ep.status === 'awaiting_staff_scheduling') return 'The care team accepted the referral. Staff will arrange an appointment because automatic assignment was not authorized.';
  if (ep.status === 'coordination_inquiry') return 'The care team will confirm the department named on your existing referral.';
  if (ep.status === 'department_inquiry') return 'Your request is in the referral department inbox for staff acceptance.';
  return ep.schedulingReason || '';
}
function journeyHeading(ep) {
  if (ep.status === 'booked') return ui.role === 'patient' ? 'Your appointment is ready' : 'Preparing for the visit';
  if (ep.status === 'checked_in') return 'Visit in progress';
  if (ep.status === 'completed') return 'Visit completed';
  if (ep.status === 'waitlisted') return 'Waiting for a matching appointment';
  if (ep.status === 'awaiting_staff_scheduling') return 'Staff is arranging your visit';
  if (['coordination_inquiry', 'department_inquiry'].includes(ep.status)) return 'Referral request awaiting staff acceptance';
  return ep.status === 'needs_route' ? 'Referral route under review' : 'Ready for an appointment';
}
function episodeSummary(ep) { const slot = slotById(ep.slotId); const specialist = slot && specialistById(slot.specialistId); return `${ep.kind === 'follow_up' ? 'Follow-up' : 'Initial visit'} · ${departmentById(ep.departmentId)?.name || 'Route pending'}${slot ? ` · ${day(slot.date)}${specialist ? ` with ${specialist.name}` : ''}` : ep.dueDate ? ` · due ${day(ep.dueDate)}` : ''}`; }

function renderInquiryQueue() {
  const inquiries = openEpisodes().filter(ep => ['coordination_inquiry', 'department_inquiry', 'ready_to_book', 'needs_route', 'waitlisted', 'awaiting_staff_scheduling'].includes(ep.status));
  const shown = inquiries.filter(ep => !ui.departmentFilter || (ui.departmentFilter === 'coordination' ? !ep.departmentId : ep.departmentId === ui.departmentFilter));
  return `<section class="card inquiry-queue"><div class="card-heading"><div><div class="eyebrow">DEPARTMENT INBOX</div><h2>Referral requests</h2></div><span class="count-label">${inquiries.length} open</span></div><div class="inquiry-filter"><label>Department <select data-filter-department><option value="">All departments (${inquiries.length})</option><option value="coordination" ${ui.departmentFilter === 'coordination' ? 'selected' : ''}>General coordination (${inquiries.filter(ep => !ep.departmentId).length})</option>${data.departments.map(dept => `<option value="${esc(dept.id)}" ${ui.departmentFilter === dept.id ? 'selected' : ''}>${esc(dept.name)} (${inquiries.filter(ep => ep.departmentId === dept.id).length})</option>`).join('')}</select></label></div>${shown.length ? `<div class="inquiry-list">${shown.map(ep => `<div class="inquiry-row"><div class="inquiry-copy"><strong>${esc(patientById(ep.patientId)?.name || 'Patient')}</strong><small>${esc(departmentById(ep.departmentId)?.name || 'General coordination')} · ${esc(patientById(ep.patientId)?.language || '')} · ${statusLabel(ep)}</small><small>${ep.preferredDate ? `From ${day(ep.preferredDate)}` : 'Any date'} · ${ep.preferredTime ? esc(ep.preferredTime) : 'Any time'}${ep.preferredSpecialistId ? ` · ${esc(specialistById(ep.preferredSpecialistId)?.name || '')}` : ''}</small></div><div class="inquiry-actions">${ep.status === 'awaiting_staff_scheduling' ? '<span class="attention-tag">Staff scheduling needed</span>' : ep.status === 'waitlisted' ? `<button type="button" class="button secondary small" data-accept="${esc(ep.id)}">Retry available slots</button>` : ep.departmentId ? `<button type="button" class="button primary small" data-accept="${esc(ep.id)}">Accept & arrange</button>` : `<form data-form="accept_inquiry" data-inquiry="${esc(ep.id)}"><select name="departmentId" required aria-label="Department for ${esc(patientById(ep.patientId)?.name)}"><option value="">Select department</option>${data.departments.map(dept => `<option value="${esc(dept.id)}">${esc(dept.name)}</option>`).join('')}</select><button class="button primary small">Accept & arrange</button></form>`}<button type="button" class="link-button" data-patient="${esc(ep.patientId)}" data-episode="${esc(ep.id)}" data-view="journeys">View journey →</button></div></div>`).join('')}</div>` : empty('No requests in this department', 'Choose another department or wait for a new referral.')}</section>`;
}

function renderConnectorCard() {
  if (!connector) return '';
  return `<section class="connector-card"><div><span class="eyebrow">HOSPITAL DIRECTORY</span><strong>${connector.configured ? connector.reachable ? 'Connected' : 'Connection unavailable' : 'Local sample directory'}</strong><small>${data.departments.length} departments · ${data.specialists.length} specialists · ${data.slots.length} slots</small>${connector.pendingBookings ? `<small>${connector.pendingBookings} booking check(s) pending. Automatic recovery will retry; staff can also retry the inquiry.</small>` : ''}</div>${connector.configured ? '<button type="button" class="button secondary small" data-command="sync-directory">Sync directory</button>' : ''}</section>`;
}

function renderOverview() {
  const priority = openEpisodes().filter(ep => ep.needsHelp || ['needs_route', 'department_inquiry', 'coordination_inquiry', 'checked_in', 'waitlisted', 'awaiting_staff_scheduling'].includes(ep.status) || (ep.dueDate && ep.dueDate < data.today));
  const due = openEpisodes().filter(ep => ep.kind === 'follow_up').sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  return `<div class="page page-overview"><div class="page-heading"><div><div class="eyebrow">CARE DESK</div><h1>Good care, kept on track.</h1><p>One place to route referrals, prepare visits, and close the loop on follow-up care.</p></div><button class="button primary" type="button" data-command="new-patient"><span aria-hidden="true">＋</span> New patient</button></div>
    <div class="notice-banner"><div class="notice-symbol">✳</div><div><strong>Demonstration workspace</strong><p>All people and messages here are fictional. No real WhatsApp delivery, ABHA retrieval, or clinical assessment takes place.</p></div><span>LOCAL DEMO</span></div>
    <div class="prearrival-entry"><div><div class="eyebrow">BEFORE THE HOSPITAL VISIT</div><strong>Patients can start from home.</strong><p>Open this site in a separate browser profile or private window to submit a patient request. Keep that session open while staff arrange the visit here.</p></div></div>
    <section aria-label="Key measures"><div class="metrics-grid">${metricCard('Active journeys', data.metrics.active, 'Open episodes')}${metricCard('Needs routing', data.metrics.needsRouting, 'Staff review required', data.metrics.needsRouting ? 'metric-attention' : '')}${metricCard('Overdue visits', data.metrics.overdue, 'Past the original due date', data.metrics.overdue ? 'metric-attention' : '')}${metricCard('Visits completed', data.metrics.completed, 'Attendance confirmed')}${metricCard('Completion rate', data.metrics.completionRate == null ? '—' : `${data.metrics.completionRate}%`, 'Of visits due so far')}</div></section>
    ${renderConnectorCard()}${renderInquiryQueue()}
    <div class="overview-grid"><section class="card"><div class="card-heading"><div><div class="eyebrow">TAKE ACTION</div><h2>Priority worklist</h2></div><span class="count-label">${priority.length} items</span></div>${priority.length ? `<div class="worklist">${priority.map(ep => workRow(ep)).join('')}</div>` : empty('All caught up', 'No journeys need immediate attention.')}</section><section class="card"><div class="card-heading"><div><div class="eyebrow">FOLLOW-UP</div><h2>Due date watch</h2></div><button type="button" class="link-button" data-nav="inbox">Open inbox →</button></div>${due.length ? `<div class="due-list">${due.slice(0, 4).map(ep => `<button type="button" class="due-item" data-patient="${ep.patientId}" data-episode="${ep.id}" data-view="inbox"><span class="date-block"><strong>${day(ep.dueDate).split(' ')[0]}</strong><small>${day(ep.dueDate).split(' ')[1]}</small></span><span class="due-copy"><strong>${esc(patientById(ep.patientId)?.name)}</strong><small>${esc(episodeSummary(ep))}</small></span>${ep.needsHelp ? '<span class="mini-alert">Needs help</span>' : statusPill(ep)}</button>`).join('')}</div>` : empty('No follow-ups yet', 'A confirmed visit with a follow-up date will appear here.')}</section></div>
    <section class="card workflow-card"><div class="workflow-intro"><div class="eyebrow">HOW THE DESK WORKS</div><h2>A clear path from referral to return visit.</h2><p>Staff confirm the referral route, match an available specialist, and record attendance. The follow-up stays visible until the next visit is complete.</p></div><div class="workflow-steps"><div><span>01</span><strong>Review referral</strong><small>Staff select a department</small></div><div><span>02</span><strong>Book a slot</strong><small>Language and capacity checked</small></div><div><span>03</span><strong>Prepare & attend</strong><small>Documents and evidence logged</small></div><div><span>04</span><strong>Follow up</strong><small>Due date and barriers tracked</small></div></div></section>
  </div>`;
}

function workRow(ep) {
  const patient = patientById(ep.patientId);
  const reason = ep.needsHelp ? `Help requested · ${title(ep.barrier)}` : ep.status === 'needs_route' ? 'Referral needs staff routing' : ep.status === 'checked_in' ? 'Attendance ready to confirm' : 'Visit overdue';
  return `<button class="work-row" type="button" data-patient="${esc(ep.patientId)}" data-episode="${esc(ep.id)}" data-view="${ep.needsHelp ? 'inbox' : 'journeys'}"><span class="avatar">${esc(initials(patient?.name))}</span><span class="work-copy"><strong>${esc(patient?.name)}</strong><small>${esc(reason)}</small></span><span class="work-right">${ep.dueDate ? `<small>${day(ep.dueDate)}</small>` : ''}${statusPill(ep)}</span><span class="row-arrow" aria-hidden="true">↗</span></button>`;
}
function initials(name) { return String(name || '').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase(); }
function empty(heading, description) { return `<div class="empty"><div class="empty-icon">✳</div><strong>${heading}</strong><p>${description}</p></div>`; }

function renderPatientRail() {
  const patients = data.patients.filter(patient => patient.name.toLowerCase().includes(ui.search.toLowerCase()));
  return `<aside class="patient-rail" aria-label="Patients"><div class="rail-heading"><div><div class="eyebrow">FICTIONAL PATIENTS</div><h2>Journeys</h2></div>${ui.role === 'staff' ? '<button class="icon-button add-button" type="button" data-command="new-patient" aria-label="Add a fictional patient">＋</button>' : ''}</div><label class="search-wrap"><span class="sr-only">Search fictional patients</span><span aria-hidden="true">⌕</span><input type="search" data-draft="patient-search" placeholder="Search patients" value="${esc(ui.search)}"></label><div class="patient-list">${patients.length ? patients.map(patient => { const eps = patientEpisodes(patient.id); const active = eps.find(ep => ep.status !== 'completed') || eps[0]; return `<button type="button" class="patient-item ${ui.patientId === patient.id ? 'selected' : ''}" data-patient="${esc(patient.id)}"><span class="avatar">${esc(initials(patient.name))}</span><span class="patient-item-copy"><strong>${esc(patient.name)}</strong><small>${active ? statusLabel(active) : 'No episodes'} · ${esc(patient.language)}</small></span>${active?.needsHelp ? '<span class="help-dot" aria-label="Needs help"></span>' : ''}</button>`; }).join('') : empty('No matches', 'Try a different name.')}</div><div class="rail-foot">Only fictional names belong in this demo.</div></aside>`;
}

function renderJourneys() {
  if (ui.role === 'patient') return `<div class="patient-entry-page">${currentPatient() ? renderPatientWorkspace() : renderPreArrivalStart()}</div>`;
  return `<div class="split-page">${renderPatientRail()}<div class="main-content">${ui.role === 'staff' && ui.showIntake ? renderIntake() : currentPatient() ? renderPatientWorkspace() : empty('Start a journey', 'Add a fictional patient to get started.')}</div></div>`;
}

function intakeFields(patientView = false) {
  const departments = directory.departments || [];
  const specialists = directory.specialists || [];
  return `<div class="form-grid"><label>Fictional name<input name="name" required maxlength="80" placeholder="e.g. Maya Demo"></label><label>Preferred language<select name="language"><option>English</option><option>Hindi</option></select></label></div>
    <label>Department on the existing referral <span class="label-note">Choose the exact department; no symptom matching</span><select name="departmentId"><option value="">General coordination review</option>${departments.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label>
    <label>Other referral department label <span class="label-note">Use only if it is absent above</span><input name="referralDepartmentLabel" maxlength="100" placeholder="Exact wording on referral"></label>
    <label>Referral logistics note <span class="label-note">Optional; no symptoms or medical details</span><textarea name="referralNote" rows="2" maxlength="500" placeholder="Administrative context for the coordinator"></textarea></label>
    <div class="form-grid"><label>Earliest preferred date <span class="label-note">Optional</span><input type="date" name="preferredDate"></label><label>Preferred time <span class="label-note">Optional, exact slot time</span><select name="preferredTime"><option value="">Any time</option>${[...new Set((directory.slots || []).map(slot => slot.time))].sort().map(time => `<option value="${esc(time)}">${esc(time)}</option>`).join('')}</select></label></div>
    <label>Preferred specialist <span class="label-note">Optional; must belong to referral department</span><select name="preferredSpecialistId"><option value="">Any available specialist</option>${specialists.map(item => `<option value="${esc(item.id)}" data-department-id="${esc(item.departmentId)}">${esc(item.name)} · ${esc(departments.find(dept => dept.id === item.departmentId)?.name || '')}</option>`).join('')}</select></label>
    <div class="form-checks"><label class="checkbox-row"><input type="checkbox" name="contactConsent"><span><strong>Simulated patient messages</strong><small>Appointment and reminder messages in this demo.</small></span></label><label class="checkbox-row"><input type="checkbox" name="caregiverConsent"><span><strong>Simulated caregiver messages</strong><small>Only if a fictional caregiver is named below.</small></span></label></div>
    <label>Caregiver name <span class="label-note">Required with caregiver message consent</span><input name="caregiverName" maxlength="80" placeholder="Fictional name only"></label>
    <label class="checkbox-row schedule-consent"><input type="checkbox" name="scheduleConsent"><span><strong>Allow automatic appointment scheduling</strong><small>For this visit and its clinician-requested follow-ups, after department acceptance, assign an available doctor and slot matching my language and stated preferences. Otherwise the care desk will arrange it.</small></span></label>
    <div class="form-footer"><p>${patientView ? 'Return in this browser to refresh your plan. Signing out ends access to this new request.' : 'The care desk can review this request in its department inbox.'} No clinical assessment is made from this form.</p><button type="submit" class="button primary">${patientView ? 'Send pre-arrival request' : 'Create journey'} →</button></div>`;
}

function intakePayload(form, values) {
  const payload = {
    name: values.name.trim(), language: values.language,
    contactConsent: form.elements.contactConsent.checked,
    caregiverConsent: form.elements.caregiverConsent.checked,
    caregiverName: values.caregiverName?.trim() || '',
    referralNote: values.referralNote?.trim() || '',
    scheduleConsent: form.elements.scheduleConsent.checked,
  };
  if (values.departmentId) payload.departmentId = values.departmentId;
  else if (values.referralDepartmentLabel?.trim()) payload.referralDepartmentLabel = values.referralDepartmentLabel.trim();
  if (values.preferredDate) payload.preferredDate = values.preferredDate;
  if (values.preferredTime) payload.preferredTime = values.preferredTime;
  if (values.preferredSpecialistId) payload.preferredSpecialistId = values.preferredSpecialistId;
  return payload;
}

function renderPreArrivalStart() {
  return `<div class="prearrival-start"><div class="prearrival-hero"><div class="eyebrow">PATIENT PRE-ARRIVAL DEMO</div><h1>Plan your visit from home.</h1><p>Share the department on your existing referral and your appointment preferences. A care coordinator accepts the request before an appointment is assigned.</p><span>Synthetic-data prototype · No real care request is sent</span></div><form class="card form-card" data-form="pre_arrival"><div class="card-heading"><div><div class="eyebrow">START A FICTIONAL JOURNEY</div><h2>Pre-arrival request</h2></div></div>${intakeFields(true)}</form><div class="prearrival-steps"><div><span>01</span><strong>Send request</strong><small>Before leaving home</small></div><div><span>02</span><strong>Care team accepts</strong><small>Referral department reviewed</small></div><div><span>03</span><strong>See your plan</strong><small>Appointment or scheduling update</small></div></div></div>`;
}

function renderIntake() {
  return `<div class="workspace-inner"><button type="button" class="back-link" data-command="close-intake">← Back to journeys</button><div class="page-heading compact"><div><div class="eyebrow">NEW FICTIONAL PATIENT</div><h1>Start a care journey</h1><p>Use the department on the existing referral and collect appointment preferences.</p></div></div><form class="card form-card" data-form="create_patient"><div class="card-heading"><div><div class="eyebrow">BASIC DETAILS</div><h2>Patient and scheduling preferences</h2></div></div>${intakeFields()}</form></div>`;
}
function renderPatientWorkspace() {
  const patient = currentPatient();
  const ep = currentEpisode();
  const eps = patientEpisodes(patient.id);
  return `<div class="workspace-inner"><div class="patient-header"><div class="patient-title"><span class="avatar large">${esc(initials(patient.name))}</span><div><div class="eyebrow">FICTIONAL PATIENT${ui.role === 'staff' ? ` · ${esc(patient.id)}` : ''}</div><h1>${esc(patient.name)}</h1><p>${esc(patient.language)} preferred · ${eps.length} ${eps.length === 1 ? 'journey' : 'journeys'}</p></div></div><div class="header-badges">${ui.role === 'patient' ? '<button type="button" class="button secondary small" data-command="refresh">↻ Refresh journey</button>' : ''}<span class="demo-badge">DEMO RECORD</span>${ep ? statusPill(ep) : ''}</div></div>
    <div class="episode-tabs" role="group" aria-label="Patient journeys">${eps.map((item, index) => `<button type="button" data-episode="${item.id}" class="episode-tab ${item.id === ui.episodeId ? 'active' : ''}"><span>${item.kind === 'follow_up' ? `Follow-up ${eps.filter(e => e.kind === 'follow_up').length - eps.slice(0, index).filter(e => e.kind === 'follow_up').length}` : 'Initial visit'}</span><small>${statusLabel(item)}</small></button>`).join('')}</div>
    ${ep ? `<div class="journey-hero"><div><div class="eyebrow">${ep.kind === 'follow_up' ? 'FOLLOW-UP JOURNEY' : 'INITIAL JOURNEY'}</div><h2>${journeyHeading(ep)}</h2><p>${esc(episodeSummary(ep))}</p></div>${ep.dueDate ? `<div class="due-callout"><span>${ep.kind === 'follow_up' ? 'CLINICIAN-SET DUE DATE' : 'ORIGINAL APPOINTMENT DATE'}</span><strong>${day(ep.originalDueDate || ep.dueDate)}</strong>${ep.slotId && slotById(ep.slotId)?.date !== ep.dueDate ? `<small>Appointment: ${day(slotById(ep.slotId).date)}</small>` : ''}</div>` : ''}</div>
    ${renderProgress(ep)}
    ${ui.role === 'patient' ? renderPatientExperience(ep, patient) : `<div class="workspace-grid"><div class="workspace-primary">${renderRouting(ep)}${renderBooking(ep, patient)}${renderDocuments(ep)}${renderAttendance(ep)}${renderConversation(ep, patient)}</div><div class="workspace-aside">${renderSnapshot(ep, patient)}${renderConsent(patient)}${renderAudit(ep)}</div></div>`}` : empty('No journey selected', 'Select a journey above.')}</div>`;
}

function renderPatientExperience(ep, patient) {
  const slot = slotById(ep.slotId);
  const specialist = slot && specialistById(slot.specialistId);
  return `<div class="patient-mode-note">YOUR PATIENT SESSION · Only your journey is shown. Refresh here to see your updated plan.</div><div class="workspace-grid"><div class="workspace-primary"><section class="card"><div class="eyebrow">YOUR NEXT STEP</div><h2>${journeyHeading(ep)}</h2>${slot ? `<div class="appointment-summary"><div class="calendar-icon"><strong>${day(slot.date).split(' ')[0]}</strong><small>${day(slot.date).split(' ')[1]}</small></div><div><strong>${day(slot.date)} · ${esc(slot.time)}</strong><p>${esc(specialist?.name || 'Specialist')} · ${esc(specialist?.room || '')}</p><p>${esc(departmentById(ep.departmentId)?.name || '')} · ${esc(departmentById(ep.departmentId)?.location || '')}</p></div></div><p class="section-copy">Your appointment details are ready for your visit.</p>` : `<p class="section-copy">${esc(schedulingNote(ep))}</p>`}${ep.preferredDate || ep.preferredTime || ep.preferredSpecialistId ? `<div class="preference-note"><strong>Your preferences</strong><span>${ep.preferredDate ? `From ${day(ep.preferredDate)}` : 'Any date'} · ${ep.preferredTime ? esc(ep.preferredTime) : 'Any time'} · ${ep.preferredSpecialistId ? esc(specialistById(ep.preferredSpecialistId)?.name || 'Chosen specialist') : 'Any specialist'}</span></div>` : ''}</section>${renderDocuments(ep)}${renderConversation(ep, patient, true)}</div><div class="workspace-aside">${renderSnapshot(ep, patient)}${renderConsent(patient)}</div></div>`;
}
function renderProgress(ep) {
  const names = ui.role === 'patient' ? ['Request', 'Route confirmed', 'Appointment ready', 'Visit'] : ['Route', 'Appointment', 'Check-in', 'Confirmed'];
  const current = ui.role === 'patient' ? ({ needs_route: 0, ready_to_book: 1, booked: 2, checked_in: 3, completed: 3 })[ep.status] : ({ needs_route: 0, ready_to_book: 1, booked: 1, checked_in: 2, completed: 3 })[ep.status];
  return `<div class="progress" aria-label="Journey progress">${names.map((name, index) => `<div class="progress-step ${index <= current ? 'done' : ''} ${index === current ? 'current' : ''}"><span class="step-circle">${index < current ? '✓' : index + 1}</span><span>${name}</span></div>`).join('')}</div>`;
}

function renderRouting(ep) {
  const department = departmentById(ep.departmentId);
  const inquiry = ['department_inquiry', 'coordination_inquiry', 'ready_to_book'].includes(ep.status);
  return `<section class="card" id="route"><div class="card-heading"><div><div class="eyebrow">01 · REFERRAL ROUTE</div><h2>Department review</h2></div>${ep.inquiryAcceptedAt || ep.routeConfirmedBy ? '<span class="verified">✓ Staff accepted</span>' : '<span class="attention-tag">Review needed</span>'}</div><div class="detail-pair"><span>Department</span><strong>${esc(department?.name || 'General coordination')}</strong></div>${ep.referralNote ? `<div class="note-box"><small>REFERRAL LOGISTICS</small><p>${esc(ep.referralNote)}</p></div>` : ''}${inquiry ? `<p class="section-copy">Accept the department on the existing referral. No symptoms are used to infer a route.</p>${department ? `<button type="button" class="button primary" data-accept="${esc(ep.id)}">Accept & arrange →</button>` : `<form data-form="accept_inquiry" data-inquiry="${esc(ep.id)}"><label>Department on referral<select name="departmentId" required><option value="">Choose department</option>${data.departments.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><button class="button primary">Accept & arrange →</button></form>`}` : ep.status === 'needs_route' ? `<form data-form="confirm_route"><label>Department<select name="departmentId" required><option value="">Choose department</option>${data.departments.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><label>Referral note<textarea name="referralNote" required maxlength="500">${esc(ep.referralNote)}</textarea></label><button class="button primary">Confirm route</button></form>` : `<div class="detail-pair"><span>Confirmed by</span><strong>${esc(ep.routeConfirmedBy || '—')}</strong></div>${ep.routingReason ? `<p class="field-hint">${esc(ep.routingReason)}</p>` : ''}${ep.schedulingReason ? `<div class="scheduling-result"><strong>${statusLabel(ep)}</strong><p>${esc(ep.schedulingReason)}</p>${ep.status === 'waitlisted' ? `<small>Reason: ${ep.waitlistReason === 'patient_preferences' ? 'Requested preferences' : 'No matching capacity'}</small><button type="button" class="button secondary small" data-accept="${esc(ep.id)}">Retry available slots</button>` : ''}</div>` : ''}`}</section>`;
}
function availableSlots(specialistId, ownEpisodeId) {
  return data.slots.filter(slot => slot.specialistId === specialistId && slot.date >= data.today).map(slot => {
    const occupied = data.episodes.filter(ep => ep.slotId === slot.id && ep.id !== ownEpisodeId).length;
    return { ...slot, remaining: Math.max(0, slot.capacity - occupied) };
  }).filter(slot => slot.remaining > 0).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function renderBooking(ep, patient) {
  if (['needs_route', 'department_inquiry', 'coordination_inquiry'].includes(ep.status)) return '';
  const currentSlot = slotById(ep.slotId);
  const currentSpecialist = currentSlot && specialistById(currentSlot.specialistId);
  const canBook = ['ready_to_book', 'booked', 'waitlisted', 'awaiting_staff_scheduling'].includes(ep.status) && !connector?.configured;
  const specialists = data.specialists.filter(item => item.departmentId === ep.departmentId && item.languages.includes(patient.language));
  const candidates = specialists.map(item => ({ ...item, available: availableSlots(item.id, ep.id) })).filter(item => item.available.length);
  return `<section class="card" id="appointment"><div class="card-heading"><div><div class="eyebrow">02 · APPOINTMENT</div><h2>${ep.slotId ? 'Booked appointment' : 'Find an available specialist'}</h2></div>${currentSlot ? '<span class="verified">✓ Slot confirmed</span>' : ''}</div>${currentSlot ? `<div class="appointment-summary"><div class="calendar-icon"><strong>${day(currentSlot.date).split(' ')[0]}</strong><small>${day(currentSlot.date).split(' ')[1]}</small></div><div><strong>${day(currentSlot.date)} · ${esc(currentSlot.time)}</strong><p>${esc(currentSpecialist?.name || 'Specialist')} · ${esc(currentSpecialist?.room || '')}</p></div></div>` : ''}
    ${ep.hospitalReservation ? '<p class="verified">✓ Sample hospital acknowledged this booking</p>' : currentSlot && connector?.configured ? '<p class="field-hint">Existing local demo booking; no hospital acknowledgement recorded.</p>' : ''}${connector?.configured && ['booked', 'awaiting_staff_scheduling'].includes(ep.status) ? '<p class="field-hint">Changes and staff-arranged appointments require hospital coordination in this prototype.</p>' : ''}${canBook ? `<p class="section-copy">Showing specialists in ${esc(departmentById(ep.departmentId)?.name)} who speak ${esc(patient.language)} and have open slots. Staff chooses the appointment.</p>${candidates.length ? `<div class="candidates">${candidates.map(item => `<div class="candidate"><div class="candidate-top"><div class="doctor-icon">✳</div><div><strong>${esc(item.name)}</strong><small>${esc(item.room)} · ${esc(departmentById(item.departmentId)?.name)}</small></div></div><div class="match-reason"><span>✓ Department match</span><span>✓ ${esc(patient.language)} spoken</span><span>✓ Open slots</span></div><div class="slot-list">${item.available.slice(0, 4).map(slot => `<button type="button" class="slot-button ${ep.slotId === slot.id ? 'current-slot' : ''}" data-book="${slot.id}" ${ep.slotId === slot.id ? 'disabled' : ''}><strong>${day(slot.date)}</strong><span>${esc(slot.time)}</span><small>${ep.slotId === slot.id ? 'Current' : `${slot.remaining} left`}</small></button>`).join('')}</div></div>`).join('')}</div>` : empty('No matching slots available', 'Advance the demo date or use another department only when the referral supports it.')}` : `<p class="section-copy muted">${esc(schedulingNote(ep) || (ep.status === 'checked_in' ? 'Visit in progress.' : 'Visit complete.'))}</p>`}</section>`;
}

function renderDocuments(ep) {
  const ready = ep.checklist.filter(item => item.ready).length;
  const docs = (data.documents || []).filter(doc => doc.patientId === ep.patientId);
  if (session.publicDemo) return `<section class="card" id="documents"><div class="eyebrow">03 · VISIT PREPARATION</div><h2>Documents & readiness</h2><p class="section-copy">${ready} of ${ep.checklist.length} ready. Try the checklist with fictional information. File uploads and ledger connections are available in the local prototype; they are disabled in this public demo.</p><div class="document-list">${ep.checklist.map(item => `<label class="document-item"><input type="checkbox" data-document="${esc(item.id)}" ${item.ready ? 'checked' : ''}><span class="document-check" aria-hidden="true">✓</span><span>${esc(item.label)}</span><small>${item.ready ? 'Ready' : 'Pending'}</small></label>`).join('')}</div></section>`;
  return `<section class="card" id="documents"><div class="card-heading"><div><div class="eyebrow">03 · VISIT PREPARATION</div><h2>Documents & readiness</h2></div><span class="count-label">${ready} of ${ep.checklist.length} ready</span></div><p class="section-copy">Files are encrypted offchain. Optional Fabric anchoring stores only an opaque commitment and does not establish clinical authenticity.</p><div class="document-list">${ep.checklist.map(item => `<label class="document-item"><input type="checkbox" data-document="${esc(item.id)}" ${item.ready ? 'checked' : ''}><span class="document-check" aria-hidden="true">✓</span><span>${esc(item.label)}</span><small>${item.ready ? 'Ready' : 'Pending'}</small></label>`).join('')}</div><div class="divider"></div><div class="document-files"><strong>Saved files · ${docs.length} of 5</strong>${docs.length ? docs.map(doc => `<div class="saved-document"><div><strong>${esc(doc.name)}</strong><small>${(doc.size / 1024).toFixed(1)} KB · ${esc(doc.anchorStatus.replaceAll('_', ' '))}</small></div><div class="document-actions"><a class="button secondary small" href="/api/documents/${encodeURIComponent(doc.id)}/download">Download</a>${doc.ledgerConsent && doc.anchorStatus !== 'anchored' ? `<button type="button" class="button secondary small" data-doc-action="anchor" data-doc-id="${esc(doc.id)}">Retry anchor</button>` : ''}${doc.ledgerConsent ? `<button type="button" class="button secondary small" data-doc-action="verify" data-doc-id="${esc(doc.id)}">Verify integrity</button>` : ''}<button type="button" class="button subtle-danger small" data-doc-action="delete" data-doc-id="${esc(doc.id)}">Delete</button></div></div>`).join('') : '<p class="field-hint">No files saved for this patient.</p>'}</div>${docs.length < 5 ? `<form data-form="upload_document" class="document-upload"><label>PDF, UTF-8 text or JSON · up to 2 MB<input name="file" type="file" accept=".pdf,.txt,.json,application/pdf,text/plain,application/json" required></label><label class="checkbox-row compact"><input name="ledgerConsent" type="checkbox"><span><strong>Anchor an opaque commitment to Fabric</strong><small>Optional. The encrypted file remains offchain; a commitment remains on the ledger after file deletion.</small></span></label><button class="button secondary" type="submit">Save document</button></form>` : ''}</section>`;
}
function renderAttendance(ep) {
  if (!ep.slotId) return '';
  const slot = slotById(ep.slotId);
  const canCheckIn = ep.status === 'booked' && slot.date <= data.today;
  return `<section class="card" id="attendance"><div class="card-heading"><div><div class="eyebrow">04 · VISIT OUTCOME</div><h2>Attendance & next step</h2></div>${ep.status === 'completed' ? '<span class="verified">✓ Confirmed</span>' : ''}</div>${ep.status === 'booked' ? `<p class="section-copy">Check in when the appointment day arrives. Attendance is confirmed separately after the visit.</p><button class="button primary" type="button" data-command="check-in" ${canCheckIn ? '' : 'disabled'}>Record check-in</button>${canCheckIn ? '' : `<p class="field-hint">Available from ${day(slot.date)}. Set the demo date if you want to simulate that day.</p>`}` : ep.status === 'checked_in' ? `<div class="checkin-notice">✓ Checked in ${stamp(ep.checkedInAt)}</div><form data-form="complete_visit"><div class="form-grid"><label>Follow-up due date <span class="label-note">Optional, clinician-set</span><input name="followUpDate" type="date" min="${esc(data.today)}"></label></div><label>Attendance evidence <textarea name="evidence" rows="3" required maxlength="500" placeholder="e.g. Front desk attendance register checked"></textarea></label><div class="card-actions"><button class="button primary" type="submit">Confirm visit complete →</button></div></form>` : `<div class="detail-pair"><span>Attendance evidence</span><strong>${esc(ep.attendanceEvidence || 'Recorded')}</strong></div><div class="detail-pair"><span>Confirmed by</span><strong>${esc(ep.attendanceConfirmedBy || '—')}</strong></div><div class="detail-pair"><span>Completed</span><strong>${stamp(ep.completedAt)}</strong></div>`}</section>`;
}

function renderSnapshot(ep, patient) {
  const slot = slotById(ep.slotId);
  return `<section class="card side-card"><div class="eyebrow">AT A GLANCE</div><h2>Journey details</h2><div class="snapshot-row"><span>Type</span><strong>${ep.kind === 'follow_up' ? 'Follow-up' : 'Initial visit'}</strong></div><div class="snapshot-row"><span>Department</span><strong>${esc(departmentById(ep.departmentId)?.name || 'Pending review')}</strong></div><div class="snapshot-row"><span>Language</span><strong>${esc(patient.language)}</strong></div><div class="snapshot-row"><span>Appointment</span><strong>${slot ? `${day(slot.date)}, ${esc(slot.time)}` : 'Not booked'}</strong></div><div class="snapshot-row"><span>Original due date</span><strong>${day(ep.originalDueDate)}</strong></div>${ep.needsHelp ? `<div class="barrier-banner"><strong>Help requested: ${title(ep.barrier)}</strong><span>${ui.role === 'patient' ? 'The care desk can review this request.' : 'Open in the follow-up inbox to resolve.'}</span>${ui.role === 'staff' ? '<button type="button" class="link-button" data-nav="inbox">Open inbox →</button>' : ''}</div>` : ''}</section>`;
}

function renderConsent(patient) {
  const episode = currentEpisode();
  const scheduling = episode && episode.status !== 'completed' ? `<div class="divider"></div><form data-form="set_scheduling_consent"><label class="checkbox-row compact"><input name="scheduleConsent" type="checkbox" ${episode.scheduleConsent ? 'checked' : ''}><span><strong>Automatic scheduling</strong><small>Allow matching for this unbooked visit and future follow-ups. Changing this does not cancel a confirmed appointment; contact the care desk to change that.</small></span></label><button type="submit" class="button secondary full">Save scheduling consent</button></form>` : '';
  return `<section class="card side-card" id="consent"><div class="eyebrow">CONTACT PREFERENCES</div><h2>Consent & access</h2><p class="section-copy">Current consent is checked before each simulated reminder or approved draft.</p><form data-form="update_consent"><label class="checkbox-row compact"><input name="contactConsent" type="checkbox" ${patient.contactConsent ? 'checked' : ''}><span><strong>Patient messages</strong><small>Simulated WhatsApp</small></span></label><label class="checkbox-row compact"><input name="caregiverConsent" type="checkbox" ${patient.caregiverConsent ? 'checked' : ''}><span><strong>Caregiver messages</strong><small>Simulated WhatsApp</small></span></label><label class="small-label">Caregiver name<input name="caregiverName" maxlength="80" value="${esc(patient.caregiverName || '')}" placeholder="Fictional name" ${patient.caregiverConsent ? 'required' : ''}></label><button type="submit" class="button secondary full">Save contact consent</button></form>${scheduling}<div class="divider"></div><label class="checkbox-row compact"><input type="checkbox" data-abha="${esc(patient.id)}" ${patient.abhaConsent ? 'checked' : ''}><span><strong>Simulated ABHA consent</strong><small>Optional. No records are retrieved.</small></span></label><p class="integration-note"><span class="live-dot"></span>ABHA connection: simulated</p></section>`;
}

function renderConversation(ep, patient, patientView = false) {
  const allMessages = data.messages.filter(message => message.episodeId === ep.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const messages = patientView ? allMessages.filter(message => message.status !== 'draft') : allMessages;
  const drafts = allMessages.filter(message => message.direction === 'outbound' && message.status === 'draft');
  return `<section class="card conversation-card" id="conversation"><div class="card-heading"><div><div class="eyebrow">SIMULATED WHATSAPP</div><h2>Conversation</h2></div><span class="sim-tag">No messages sent</span></div><div class="conversation-label">Patient: ${esc(patient.name)} · ${esc(patient.language)} preferred</div><div class="message-stream">${messages.length ? messages.filter(message => !patientView || message.status !== 'draft').map(message => `<div class="message-row ${message.direction}"><div class="bubble"><p>${esc(message.text)}</p><small>${message.direction === 'inbound' ? 'Patient reply' : `${title(message.kind)} · ${message.status === 'draft' ? 'Staff draft' : 'Simulated'} · ${message.source === 'openai' ? 'AI-assisted' : message.source === 'clinic_template' ? 'Clinic template' : 'Staff'}`} · ${stamp(message.createdAt)}</small></div></div>`).join('') : empty('No messages yet', 'Run reminders or add a simulated patient reply to start this thread.')}</div>${!patientView && drafts.length ? `<div class="draft-approvals"><strong>Drafts awaiting staff approval</strong><p class="draft-note">Improve uses only the selected barrier category and language. ${data.integrations.ai === 'configured' ? 'An AI draft may be available.' : 'Clinic template fallback is active.'}</p>${drafts.map(message => `<div class="draft-row"><span>${esc(message.recipient)} · ${esc(message.language)} · ${message.source === 'openai' ? 'AI-assisted' : 'Clinic template'}</span><div class="draft-buttons"><button type="button" class="button secondary small" data-enhance="${esc(message.id)}">Improve draft</button><button type="button" class="button primary small" data-approve="${esc(message.id)}">Approve simulated send</button></div></div>`).join('')}</div>` : ''}<form data-form="patient_reply" class="reply-form"><div class="reply-header"><span class="role-pill">${patientView ? 'PATIENT RESPONSE' : 'RECORD A PATIENT RESPONSE'}</span><small>Choose a barrier explicitly; no free-text classification</small></div><div class="form-grid"><label>What is getting in the way? <select name="barrier" required><option value="">Select a barrier</option>${['travel', 'cost', 'work', 'caregiver', 'language', 'booking', 'medical', 'other'].map(value => `<option value="${value}">${title(value)}${value === 'medical' ? ' question (staff only)' : ''}</option>`).join('')}</select></label><label>Optional synthetic note <input name="text" maxlength="500" placeholder="Logistics only; no medical details"></label></div><div class="card-actions"><button class="button secondary" type="submit">Add simulated patient reply</button></div></form></section>`;
}

function renderAudit(ep) {
  const events = data.audit.filter(item => item.episodeId === ep.id).slice(0, 6);
  return `<section class="card side-card"><div class="eyebrow">RECORD OF ACTIONS</div><h2>Audit trail</h2>${events.length ? `<div class="audit-list">${events.map(item => `<div class="audit-item"><span class="audit-dot"></span><div><strong>${esc(title(item.action))}</strong><p>${esc(item.detail || '')}</p><small>${esc(item.actor)} · ${stamp(item.createdAt)}</small></div></div>`).join('')}</div>` : empty('No actions yet', 'Actions on this journey will appear here.')}</section>`;
}

function renderInbox() {
  if (ui.role === 'patient') return `<div class="patient-entry-page"><div class="workspace-inner"><div class="page-heading compact"><div><div class="eyebrow">YOUR CARE JOURNEY</div><h1>Messages</h1><p>A simulated conversation for ${esc(currentPatient()?.name || 'your fictional journey')}.</p></div><button type="button" class="button secondary small" data-command="refresh">↻ Refresh journey</button></div>${currentEpisode() && currentPatient() ? `${renderConversation(currentEpisode(), currentPatient(), true)}${renderConsent(currentPatient())}` : renderPreArrivalStart()}</div></div>`;
  const followups = openEpisodes().filter(ep => ep.kind === 'follow_up').sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const help = openEpisodes().filter(ep => ep.needsHelp);
  const chosen = currentEpisode();
  const patient = currentPatient();
  return `<div class="page inbox-page"><div class="page-heading"><div><div class="eyebrow">FOLLOW-UP DESK</div><h1>Keep the next visit moving.</h1><p>See who is due, respond to logistical barriers, and approve simulated message drafts.</p></div><button type="button" class="button secondary" data-command="run-reminders">Run reminders</button></div><div class="inbox-metrics">${metricCard('Open follow-ups', followups.length, 'Clinician-set dates')}${metricCard('Help requested', help.length, 'Needs staff resolution', help.length ? 'metric-attention' : '')}${metricCard('Checked in', data.metrics.checkedIn, 'Ready for attendance evidence')}</div>${renderInquiryQueue()}<div class="inbox-grid"><section class="card inbox-list-card"><div class="card-heading"><div><div class="eyebrow">WORKLIST</div><h2>Follow-up journeys</h2></div><span class="count-label">${followups.length}</span></div>${followups.length ? `<div class="inbox-list">${followups.map(ep => `<button type="button" class="inbox-item ${ui.episodeId === ep.id ? 'selected' : ''}" data-patient="${ep.patientId}" data-episode="${ep.id}" data-view="inbox"><span class="avatar">${esc(initials(patientById(ep.patientId)?.name))}</span><span><strong>${esc(patientById(ep.patientId)?.name)}</strong><small>Due ${day(ep.originalDueDate || ep.dueDate)} · ${statusLabel(ep)}</small></span>${ep.needsHelp ? '<span class="mini-alert">Help</span>' : ''}</button>`).join('')}</div>` : empty('No follow-ups yet', 'Confirm a visit with a future follow-up date to create one.')}<div class="card-heading secondary-heading"><div><div class="eyebrow">NEEDS A RESPONSE</div><h2>Help requests</h2></div><span class="count-label">${help.length}</span></div>${help.length ? `<div class="inbox-list">${help.map(ep => `<button type="button" class="inbox-item" data-patient="${ep.patientId}" data-episode="${ep.id}" data-view="inbox"><span class="avatar warm">${esc(initials(patientById(ep.patientId)?.name))}</span><span><strong>${esc(patientById(ep.patientId)?.name)}</strong><small>${title(ep.barrier)} barrier · ${ep.kind === 'follow_up' ? 'Follow-up' : 'Initial visit'}</small></span><span class="row-arrow">↗</span></button>`).join('')}</div>` : `<div class="quiet-state">No help requests are waiting.</div>`}</section><div class="inbox-detail">${chosen && patient ? `<div class="inbox-detail-head"><div><div class="eyebrow">SELECTED CONVERSATION</div><h2>${esc(patient.name)}</h2><p>${esc(episodeSummary(chosen))}</p></div><button type="button" class="link-button" data-nav="journeys">Open journey →</button></div>${chosen.needsHelp ? `<section class="card barrier-card"><div class="eyebrow">STAFF ACTION REQUIRED</div><h2>${title(chosen.barrier)} barrier</h2><p>Sending a message does not resolve the barrier. Record the outcome after staff follow-through.</p><form data-form="resolve_barrier"><label>Resolution note <textarea name="note" rows="2" required maxlength="500" placeholder="What logistical help was completed?"></textarea></label><button type="submit" class="button primary">Log resolution</button></form></section>` : ''}${renderConversation(chosen, patient)}<div class="inbox-consent">${renderConsent(patient)}</div>` : empty('Select a conversation', 'Choose a follow-up or help request from the list.')}</div></div></div>`;
}

app.addEventListener('input', event => { if (event.target.dataset.draft) { ui.drafts[event.target.dataset.draft] = event.target.value; if (event.target.dataset.draft === 'patient-search') { const focus = preserveFocus(); ui.search = event.target.value; render(); restoreFocus(focus); } } });
app.addEventListener('change', event => {
  if (event.target.matches('[data-filter-department]')) { ui.departmentFilter = event.target.value; render(); return; }
  if (event.target.name === 'departmentId' && ['pre_arrival', 'create_patient'].includes(event.target.closest('form')?.dataset.form)) {
    const form = event.target.closest('form');
    const preferred = form.elements.preferredSpecialistId;
    preferred.value = '';
    [...preferred.options].forEach(option => { option.disabled = !!option.value && (!event.target.value || option.dataset.departmentId !== event.target.value); });
    form.elements.referralDepartmentLabel.disabled = !!event.target.value;
  }
  if (event.target.name === 'caregiverConsent') {
    const name = event.target.closest('form')?.elements.caregiverName;
    if (name) name.required = event.target.checked;
  }
  if (event.target.dataset.document) action('checklist', { episodeId: ui.episodeId, documentId: event.target.dataset.document, ready: event.target.checked }, 'Document readiness updated');
  if (event.target.dataset.abha) action('abha_consent', { patientId: event.target.dataset.abha, consent: event.target.checked }, 'Simulated ABHA consent updated');
});
app.addEventListener('click', event => {
  const accept = event.target.closest('[data-accept]');
  if (accept) { action('accept_inquiry', { episodeId: accept.dataset.accept }, 'Inquiry accepted'); return; }
  const docAction = event.target.closest('[data-doc-action]');
  if (docAction) {
    const operation = docAction.dataset.docAction;
    if (operation === 'delete' && !window.confirm('Delete this encrypted file? Any Fabric commitment already submitted will remain.')) return;
    postApi(`/api/documents/${encodeURIComponent(docAction.dataset.docId)}/${operation}`, {}, operation === 'delete' ? 'File deleted; any ledger commitment remains' : 'Fabric commitment updated');
    return;
  }
  const demoPatient = event.target.closest('[data-demo-patient]');
  if (demoPatient) { sessionAction('demo', { role: 'patient', patientId: demoPatient.dataset.demoPatient }); return; }
  const nav = event.target.closest('[data-nav]');
  if (nav) { ui.tab = nav.dataset.nav; ui.showIntake = false; render(); window.scrollTo(0, 0); return; }
  const patient = event.target.closest('[data-patient]');
  if (patient) { ui.patientId = patient.dataset.patient; ui.episodeId = patient.dataset.episode || patientEpisodes(ui.patientId)[0]?.id; ui.tab = patient.dataset.view || ui.tab; ui.showIntake = false; render(); window.scrollTo(0, 0); return; }
  const episode = event.target.closest('[data-episode]');
  if (episode) { ui.episodeId = episode.dataset.episode; render(); return; }
  const booking = event.target.closest('[data-book]');
  if (booking) { action('book', { episodeId: ui.episodeId, slotId: booking.dataset.book }, currentEpisode()?.slotId ? 'Appointment rescheduled' : 'Appointment booked'); return; }
  const approve = event.target.closest('[data-approve]');
  if (approve) { action('approve_message', { messageId: approve.dataset.approve }, 'Draft approved and simulated'); return; }
  const enhance = event.target.closest('[data-enhance]');
  if (enhance) { action('enhance_draft', { messageId: enhance.dataset.enhance }, 'Draft improved for staff review'); return; }
  const command = event.target.closest('[data-command]')?.dataset.command;
  if (!command) return;
  if (command === 'logout') { sessionAction('logout'); return; }
  if (command === 'demo-staff') { sessionAction('demo', { role: 'staff' }); return; }
  if (command === 'retry') load();
  if (command === 'refresh') load('Journey refreshed');
  if (command === 'sync-directory') postApi('/api/connector/sync', {}, 'Hospital directory synced');
  if (command === 'new-patient') { ui.tab = 'journeys'; ui.showIntake = true; render(); window.scrollTo(0, 0); }
  if (command === 'close-intake') { ui.showIntake = false; render(); }
  if (command === 'check-in') action('check_in', { episodeId: ui.episodeId }, 'Patient checked in');
  if (command === 'run-reminders') { const toolsDialog = document.querySelector('#tools-dialog'); if (toolsDialog?.open) toolsDialog.close(); action('run_reminders', {}, 'Due reminders generated in the simulated inbox'); }
  if (command === 'demo-tools') document.querySelector('#tools-dialog')?.showModal();
  if (command === 'set-date') { const date = document.querySelector('#demo-date')?.value; document.querySelector('#tools-dialog')?.close(); action('set_date', { date }, `Demo day set to ${day(date)}`); }
  if (command === 'reset') { document.querySelector('#tools-dialog')?.close(); document.querySelector('#reset-dialog')?.showModal(); }
});
app.addEventListener('close', event => { if (event.target.id === 'reset-dialog' && event.target.returnValue === 'confirm') action('reset_demo', {}, 'Original demo data restored'); }, true);
app.addEventListener('submit', event => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const type = form.dataset.form;
  if (type === 'staff_login') { sessionAction('login', { password: values.password, ...(session?.staffLogin === 'named' ? { username: values.username } : {}) }); return; }
  if (type === 'create_patient' || type === 'pre_arrival') {
    if (values.preferredSpecialistId && (!values.departmentId || directory.specialists.find(specialist => specialist.id === values.preferredSpecialistId)?.departmentId !== values.departmentId)) { notice('Choose a specialist in the selected referral department.', true); return; }
    const payload = intakePayload(form, values);
    if (type === 'create_patient') action(type, payload, 'New fictional patient created');
    else sessionAction('patient', payload, 'Pre-arrival request sent');
  }
  if (type === 'accept_inquiry') action(type, { episodeId: form.dataset.inquiry, departmentId: values.departmentId }, 'Inquiry accepted');
  if (type === 'upload_document') uploadDocument(form).catch(error => notice(error.message, true));
  if (type === 'confirm_route') action(type, { episodeId: ui.episodeId, departmentId: values.departmentId, referralNote: values.referralNote.trim() }, 'Referral route confirmed');
  if (type === 'complete_visit') action(type, { episodeId: ui.episodeId, evidence: values.evidence.trim(), ...(values.followUpDate ? { followUpDate: values.followUpDate } : {}) }, 'Visit completion recorded');
  if (type === 'patient_reply') action(type, { episodeId: ui.episodeId, barrier: values.barrier, ...(values.text?.trim() ? { text: values.text.trim() } : {}) }, 'Simulated patient reply added');
  if (type === 'resolve_barrier') action(type, { episodeId: ui.episodeId, note: values.note.trim() }, 'Barrier resolution recorded');
  if (type === 'set_scheduling_consent') action(type, { episodeId: ui.episodeId, scheduleConsent: form.elements.scheduleConsent.checked }, 'Scheduling consent updated');
  if (type === 'update_consent') action(type, { patientId: ui.patientId, contactConsent: !!form.elements.contactConsent.checked, caregiverConsent: !!form.elements.caregiverConsent.checked, caregiverName: values.caregiverName?.trim() }, 'Contact consent updated');
});

window.addEventListener('popstate', () => { clearWorkspace(); load(); });

load();
