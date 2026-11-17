const reportStorage = 'lifex-reviewed-documents-v1';
let reviewed = [];
let previousReport = '';
try {
  reviewed = JSON.parse(localStorage.getItem(reportStorage) || '[]');
  previousReport = localStorage.getItem('lifex-last-document') || '';
} catch {}
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
  return [project, ...(doc.scope === 'Global' ? ['Global'] : []), oe, vehicle, assembly, doc.component, 'Repository', doc.category].join(' › ');
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
        $('#statReview').textContent = '1';
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
    ['Lifecycle stage', doc.stage]
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
  const matches = reviewed.filter(doc => {
    const searchable = (reportPath(doc) + ' ' + Object.values(doc).join(' ')).toLowerCase();
    return (!project || doc.project === project) && terms.every(term => searchable.includes(term));
  });
  $('#historyList').innerHTML = matches.length ? matches.map(doc =>
    '<details class="repo-document"><summary><span style="color:' + categoryColors[doc.category] + '">' +
    reportEscape(doc.category) + '</span> · ' + reportEscape(doc.title) + '</summary>' +
    documentBody(doc) + '</details>').join('') : '<p class="muted">No approved documents match this view.</p>';
}
for (const [key, [label]] of Object.entries(reportProjects)) {
  $('#repoProject').add(new Option(label, key));
}
$('#repoProject').onchange = renderRepository;
$('#repoSearch').oninput = renderRepository;
$('#statDecisions').textContent = reviewed.length;
$('#statReview').textContent = '0';
renderRepository();

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
  const doc = { ...currentReport, correction };
  const next = [doc, ...reviewed.filter(item => item.id !== doc.id)];
  try { localStorage.setItem(reportStorage, JSON.stringify(next)); }
  catch { return toast('Browser storage is unavailable. The draft is still open.'); }
  reviewed = next;
  currentReport = null;
  Object.keys(answers).forEach(key => delete answers[key]);
  $$('.options[data-q] .option.selected').forEach(button => button.classList.remove('selected'));
  $('#statDecisions').textContent = reviewed.length;
  $('#statReview').textContent = '0';
  $('#lastCheckin').textContent = 'Just now';
  $('#progressFill').style.width = '100%';
  $('#progressText').textContent = 'Sample document reviewed';
  const event = document.createElement('div');
  event.className = 'event';
  event.innerHTML = '<div class="eventicon">✓</div><div><strong>' + reportEscape(doc.title) +
    '</strong><p>' + reportEscape(reportProjects[doc.project][0]) + '</p></div><span class="tag green">Approved</span>';
  $('#activity').prepend(event);
  $('#repoProject').value = doc.project;
  $('#repoSearch').value = '';
  renderRepository();
  hide('reportOverlay');
  $('#historyCard').scrollIntoView({behavior:'smooth'});
  toast('Document approved and saved to its project repository.');
};
$('#navReport').onclick = event => { event.preventDefault(); openReport(); };
$('#navHistory').onclick = event => { event.preventDefault(); $('#historyCard').scrollIntoView({behavior:'smooth'}); };
$('#viewAll').onclick = () => $('#historyCard').scrollIntoView({behavior:'smooth'});

