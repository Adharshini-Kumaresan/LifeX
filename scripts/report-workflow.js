const reportStorage = 'lifex-reviewed-documents-v1';
function readApprovalState() {
  const saved = JSON.parse(localStorage.getItem(reportStorage) || '[]');
  return Array.isArray(saved) ? { filed: saved, pending: [] } : saved;
}
let approvals = { filed: [], pending: [] };
let previousReport = '';
try {
  approvals = readApprovalState();
  previousReport = localStorage.getItem('lifex-last-document') || '';
} catch {}
const approvalDelay = 30_000;
const approvers = {
  Global: { name: 'Vasu', role: 'Global head' },
  'Project team': { name: 'Hansel', role: 'Project head' }
};
const repositories = {
  'Know-How': 'Know-How Repository',
  'Project Management': 'Project Management Repository',
  'Change Management': 'Change Management Repository',
  'Warranty / Field Return / Failure': 'Warranty Repository'
};
const repositoryName = doc => repositories[doc.category] || 'Know-How Repository';
let currentReport;
let pool = [];
let scanTimers = [];

function nextReport() {
  if (!pool.length) {
    pool = [...reportDocuments];
    for (let index = pool.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[other]] = [pool[other], pool[index]];
    }
    if (pool.at(-1).id === previousReport) pool.unshift(pool.pop());
  }
  const document = pool.pop();
  previousReport = document.id;
  try { localStorage.setItem('lifex-last-document', previousReport); } catch {}
  return { ...document, scope: answers.scope || 'Project team', generatedAt: new Date().toISOString(), correction: '' };
}

function reportPath(doc) {
  const [project, oe, vehicle, assembly] = reportProjects[doc.project];
  return [doc.scope, project, oe, vehicle, assembly, doc.component, repositoryName(doc)].filter(Boolean).join(' › ');
}

const categoryColors = {
  'Know-How': '#8af4df',
  'Project Management': '#a8c9ff',
  'Change Management': '#ffd377',
  'Warranty / Field Return / Failure': '#ff9dac'
};
const reportEscape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[character]);

function stopScan() {
  scanTimers.forEach(clearTimeout);
  scanTimers = [];
  hide('scanOverlay');
}

function startScan() {
  stopScan();
  const draft = nextReport();
  show('scanOverlay');
  $('#scanContinue').disabled = true;
  $('#scanProgress').style.width = '0%';
  $('#scanStatus').textContent = 'Preparing sample sources…';
  $('#scanSub').textContent = 'Checking synthetic email, meeting, Teams, voice and manual records.';
  $('#scanLiveLine').textContent = 'Looking up the project and component';
  $('#scanNodeCount').textContent = '00 / 04';
  $('#scanConfidence').textContent = 'Demo';
  $('#scanState').textContent = 'SCANNING';
  const steps = ['Checking source channels', 'Matched ' + draft.source + ' · ' + draft.reference,
    'Linked project, component and contributors', 'Draft ready for review'];
  const rows = $$('#scanLog > div');
  const labels = ['Email, MoM, Teams, voice and manual', 'Source reference', 'Project and ownership', 'Document'];
  rows.forEach((row, index) => {
    row.firstElementChild.textContent = labels[index];
    row.lastElementChild.textContent = 'Waiting…';
  });
  steps.forEach((message, index) => {
    scanTimers.push(setTimeout(() => {
      rows[index].lastElementChild.textContent = '✓ ' + message;
      $('#scanProgress').style.width = (index + 1) * 25 + '%';
      $('#scanNodeCount').textContent = '0' + (index + 1) + ' / 04';
      $('#scanStatus').textContent = message;
      $('#scanLiveLine').textContent = message;
      if (index === steps.length - 1) {
        currentReport = draft;
        $('#scanState').textContent = 'AWAITING REVIEW';
        $('#scanContinue').disabled = false;
        $('#statReview').textContent = approvals.pending.length + 1;
      }
    }, [1400, 3400, 6200, 9600][index]));
  });
}

function documentBody(doc) {
  const meta = [
    ['Category', doc.category], ['Learning scope', doc.scope], ['Source', doc.source + ' · ' + doc.reference],
    ['Contributor', doc.contributor], ['Owner', doc.owner], ['Team', doc.team],
    ['People involved', doc.involved], ['Source date', doc.date],
    ['Generated', doc.generatedAt && new Date(doc.generatedAt).toLocaleDateString('en-IN', {timeZone:'Asia/Kolkata'})],
    ['Lifecycle stage', doc.stage],
    ['Repository', doc.employeeApprovedAt ? repositoryName(doc) : 'Assigned after approval'],
    ...(doc.employeeApprovedAt ? [['Approval', doc.approver ? (doc.approvedAt ? doc.approver.name + ' approved · Simulated' : 'Awaiting ' + doc.approver.name + ' · Simulated') : 'Employee approved']] : [])
  ];
  return '<p class="muted small">' + reportEscape(reportPath(doc)) + '</p>' +
    '<div class="report-meta-grid">' + meta.map(([label, value]) =>
      '<div class="meta"><span>' + label + '</span><b>' + reportEscape(value) + '</b></div>').join('') + '</div>' +
    [['Problem or observation', doc.problem], ['Decision', doc.decision], ['Next step or lesson', doc.next],
      ['Reviewer correction', doc.correction]].filter(([, value]) => value).map(([label, value]) =>
      '<div class="reportsection"><h3>' + label + '</h3><p>' + reportEscape(value) + '</p></div>').join('');
}
function renderReport() {
  const doc = currentReport;
  $('#reportContent').classList.add('show');
  $('#generatedDocument').innerHTML = '<div class="reporttitle"><div><div class="eyebrow">' +
    reportEscape(doc.id) + ' · Synthetic source</div><h2>' + reportEscape(doc.title) +
    '</h2></div><span class="tag amber">Pending review</span></div>' + documentBody(doc);
  $('#correctionText').value = doc.correction;
  setCorrectionMode(Boolean(doc.correction));
  $('#reviewPrompt').textContent = answers.decision === 'no' || answers.decision === 'pending'
    ? 'Your check-in indicated no confirmed decision. Verify the draft against its source before approval.'
    : 'Does this document accurately reflect the source and the decision?';
}
function setCorrectionMode(enabled) {
  editMode = enabled;
  $('#editBox').classList.toggle('show', enabled);
  chooseOption(enabled ? $('#editBtn') : $('#accurateBtn'));
}
function openReport() {
  if (!currentReport) {
    startScan();
    return;
  }
  renderReport();
  show('reportOverlay');
}
function saveDraft() {
  currentReport.correction = editMode ? $('#correctionText').value.trim() : '';
  hide('reportOverlay');
}
function renderRepository() {
  const project = $('#repoProject').value;
  const terms = $('#repoSearch').value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const category = repositoryFilter.value;
  const matches = approvals.filed.filter(doc => {
    const searchable = (reportPath(doc) + ' ' + Object.values(doc).join(' ')).toLowerCase();
    return (!project || doc.project === project) && (!category || doc.category === category) && terms.every(term => searchable.includes(term));
  });
  $('#historyList').innerHTML = matches.length ? matches.map(doc =>
    '<details class="repo-document"><summary><span style="color:' + categoryColors[doc.category] + '">' +
    reportEscape(repositoryName(doc)) + '</span> · ' + reportEscape(doc.title) + '</summary>' +
    documentBody(doc) + '</details>').join('') : '<p class="muted">No approved documents match this view.</p>';
}
for (const [key, [label]] of Object.entries(reportProjects)) {
  $('#repoProject').add(new Option(label, key));
}
$('#repoProject').onchange = renderRepository;
$('#repoSearch').oninput = renderRepository;
const repositoryFilter = document.createElement('select');
repositoryFilter.add(new Option('All repositories', ''));
for (const [category, label] of Object.entries(repositories)) {
  repositoryFilter.add(new Option(label, category));
}
const repositoryFilterLabel = document.createElement('label');
repositoryFilterLabel.append('Repository ', repositoryFilter);
$('#repoProject').closest('.repo-filters').append(repositoryFilterLabel);
repositoryFilter.onchange = renderRepository;

const approvalQueue = document.createElement('div');
approvalQueue.setAttribute('aria-label', 'Approval activity');
$('#activity').prepend(approvalQueue);
const approvalNotice = document.createElement('div');
approvalNotice.hidden = true;
approvalNotice.setAttribute('role', 'status');
Object.assign(approvalNotice.style, { position:'fixed', right:'16px', bottom:'16px',
  maxWidth:'min(420px, calc(100vw - 32px))', zIndex:'100', padding:'14px',
  background:'#0c2432', color:'#e5fbff', border:'1px solid #59e7ff', borderRadius:'6px',
  boxShadow:'0 6px 28px #0008' });
const approvalNoticeText = document.createElement('p');
const dismissNotice = document.createElement('button');
dismissNotice.type = 'button';
dismissNotice.textContent = 'Dismiss';
dismissNotice.onclick = () => { approvalNotice.hidden = true; };
approvalNotice.append(approvalNoticeText, dismissNotice);
document.body.append(approvalNotice);

let approvalTimer;
function renderApprovalState() {
  $('#statDecisions').textContent = approvals.filed.length;
  $('#statReview').textContent = approvals.pending.length + (currentReport ? 1 : 0);
  approvalQueue.replaceChildren();
  for (const doc of [...approvals.pending, ...approvals.filed.filter(item => item.employeeApprovedAt).slice(0, 5)]) {
    const pending = !doc.approvedAt;
    const event = document.createElement('div');
    event.className = 'event';
    const icon = document.createElement('div');
    icon.className = 'eventicon';
    icon.textContent = pending ? '→' : '✓';
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = doc.title;
    const note = document.createElement('p');
    note.textContent = pending
      ? 'Sent to ' + doc.approver.name + ' · ' + doc.approver.role + ' · Simulated'
      : (doc.approver ? doc.approver.name + ' approved · Simulated · ' : '') + 'Stored in ' + repositoryName(doc);
    const status = document.createElement('span');
    status.className = 'tag ' + (pending ? 'amber' : 'green');
    status.textContent = pending ? 'Awaiting approval' : 'Stored';
    content.append(title, note);
    event.append(icon, content, status);
    approvalQueue.append(event);
  }
  renderRepository();
}

function scheduleApprovals() {
  clearTimeout(approvalTimer);
  if (!approvals.pending.length) return;
  const due = Math.min(...approvals.pending.map(doc => doc.dueAt));
  approvalTimer = setTimeout(completeApprovals, Math.max(0, due - Date.now()));
}
function completeApprovals() {
  let latest;
  try { latest = readApprovalState(); }
  catch { toast('Could not read the approval queue.'); return; }
  const now = Date.now();
  const completed = latest.pending.filter(doc => doc.dueAt <= now)
    .map(doc => ({ ...doc, approvedAt: new Date(now).toISOString() }));
  if (completed.length) {
    const next = { filed: [...completed, ...latest.filed], pending: latest.pending.filter(doc => doc.dueAt > now) };
    try { localStorage.setItem(reportStorage, JSON.stringify(next)); }
    catch {
      toast('Could not file the approved report. LifeX will retry.');
      approvalTimer = setTimeout(completeApprovals, 5000);
      return;
    }
    approvals = next;
    approvalNoticeText.textContent = completed.map(doc =>
      doc.approver.name + ' approved (simulated). ' + doc.title + ' was stored in the ' + repositoryName(doc) + '.').join(' ');
    approvalNotice.hidden = false;
  } else approvals = latest;
  renderApprovalState();
  scheduleApprovals();
}
window.addEventListener('storage', event => {
  if (event.key === reportStorage) completeApprovals();
});
completeApprovals();

$('#closeScan').onclick = stopScan;
$('#scanContinue').onclick = () => { stopScan(); openReport(); };
$('#accurateBtn').onclick = () => setCorrectionMode(false);
$('#editBtn').onclick = () => setCorrectionMode(true);
$('#closeReport').onclick = saveDraft;
$('#backToHome').onclick = () => { saveDraft(); toast('Draft saved for this session.'); };
$('#approveReport').onclick = () => {
  if (!currentReport) return;
  const correction = editMode ? $('#correctionText').value.trim() : '';
  if (editMode && !correction) {
    toast('Add your correction before approving.');
    $('#correctionText').focus();
    return;
  }
  const now = Date.now();
  const approver = approvers[currentReport.scope] || null;
  const doc = { ...currentReport, correction, approvalId: crypto.randomUUID(), approver,
    employeeApprovedAt: new Date(now).toISOString(),
    ...(approver ? { dueAt: now + approvalDelay } : { approvedAt: new Date(now).toISOString() })
  };
  try {
    const latest = readApprovalState();
    const next = approver
      ? { filed: latest.filed, pending: [doc, ...latest.pending] }
      : { filed: [doc, ...latest.filed], pending: latest.pending };
    localStorage.setItem(reportStorage, JSON.stringify(next));
    approvals = next;
  } catch { return toast('Browser storage is unavailable. The draft is still open.'); }
  currentReport = null;
  Object.keys(answers).forEach(key => delete answers[key]);
  $$('.options[data-q] .option.selected').forEach(button => button.classList.remove('selected'));
  $('#lastCheckin').textContent = 'Just now';
  $('#progressFill').style.width = '100%';
  $('#progressText').textContent = approver ? 'Employee approved · Awaiting ' + approver.name : 'Employee approved · Stored';
  $('#repoProject').value = doc.project;
  repositoryFilter.value = doc.category;
  $('#repoSearch').value = '';
  renderApprovalState();
  hide('reportOverlay');
  scheduleApprovals();
  if (approver) {
    $('#activity').scrollIntoView({behavior:'smooth'});
    toast('Sent to ' + approver.name + ' for simulated approval.');
  } else {
    $('#historyCard').scrollIntoView({behavior:'smooth'});
    toast('Stored in the ' + repositoryName(doc) + '.');
  }
};
$('#navReport').onclick = event => { event.preventDefault(); openReport(); };
$('#navHistory').onclick = event => { event.preventDefault(); $('#historyCard').scrollIntoView({behavior:'smooth'}); };
$('#viewAll').onclick = () => $('#historyCard').scrollIntoView({behavior:'smooth'});

