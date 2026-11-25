import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

let html = readFileSync('index.html', 'utf8');
function replace(original, replacement) {
  if (!html.includes(original)) throw new Error('Missing LifeX markup: ' + original.slice(0, 100));
  html = html.replace(original, () => replacement);
}
replace('</head>', '<link rel="stylesheet" href="/reports.css"></head>');
replace('<span class="ico">◷</span> Review history', '<span class="ico">◷</span> Project repositories');
replace('Both meeting and email</button>', 'Both meeting and email</button><button class="option" data-value="teams">Microsoft Teams chat</button>');
replace("   <div class=\"q\"><div class=\"qtitle\">4. Is this change likely to affect product requirements or validation?</div><div class=\"options\" data-q=\"impact\"><button class=\"option\" data-value=\"yes\">Yes, it may affect them</button><button class=\"option\" data-value=\"no\">No expected impact</button><button class=\"option\" data-value=\"unknown\">Needs assessment</button></div></div>\n", '');
replace("<div class=\"step\"><span class=\"on\"></span><span></span><span></span><span></span><span></span></div><button class=\"primary\" id=\"submitCheckin\">", "<div class=\"step\"><span class=\"on\"></span><span></span><span></span><span></span></div><button class=\"primary\" id=\"submitCheckin\">");
replace('  </div>\n  <div class="modalfoot"><div class="step">', `   <div class="q"><div class="qtitle">4. Who should this learning be useful to?</div><div class="options" data-q="scope">
   <button class="option" data-value="Personal learning">Personal learning</button><button class="option" data-value="Colleagues">Colleagues</button><button class="option" data-value="Project team">Project team</button><button class="option" data-value="Global">Global</button></div></div>
  </div>
  <div class="modalfoot"><div class="step">`);
replace("['decision','change','evidence','impact']", "['decision','change','evidence','scope']");
const sectionStart = html.indexOf('    <div class="reporttitle">');
const sectionEnd = html.indexOf('    <div class="reviewbox"', sectionStart);
if (sectionStart < 0 || sectionEnd < 0) throw new Error('Missing report body');
html = html.slice(0, sectionStart) + '<div id="generatedDocument"></div>\n' + html.slice(sectionEnd);
replace('Example: The 2,000 N·s/m value is only a test target; production value is not approved yet.', 'Add a correction to the generated document.');
replace('<div class="toast" id="toast"></div>', `<div class="toast" id="toast"></div>
<script src="/report-data.js"></script>`);
const scanStart = html.indexOf('function startScan(){');
const scanEnd = html.indexOf('// Every time the page is opened', scanStart);
if (scanStart < 0 || scanEnd < 0) throw new Error('Missing report workflow');
html = html.slice(0, scanStart) + readFileSync('scripts/report-workflow.js', 'utf8') + html.slice(scanEnd);
replace('<h2>Review history</h2><span class="muted small">Your confirmed decision trail</span>', '<h2>Project repositories</h2><span class="muted small">Approved demo documents</span>');
const historyStart = html.indexOf('<div id="historyList">');
const historyEnd = html.indexOf('</section>', historyStart);
html = html.slice(0, historyStart) + `<div class="repo-filters"><label>Project <select id="repoProject"><option value="">All projects</option></select></label>
<label>Search <input id="repoSearch" type="search" placeholder="Keyword, source, component…"></label></div><div id="historyList"></div>` + html.slice(historyEnd);
const reportsUrl = 'https://lifex-knowledge-production.up.railway.app/reports';
replace('<a href="#" id="navReport">', '<a href="' + reportsUrl + '" id="navReport">');
replace("$('#navReport').onclick = event => { event.preventDefault(); openReport(); };", '');
replace('</head>', '<style>.mobile-reports{display:none;margin-right:10px;color:var(--cyan)}@media(max-width:950px){.mobile-reports{display:inline-block}}</style></head>');
replace('<div class="user">', '<div class="user"><a class="mobile-reports" href="' + reportsUrl + '">Decision reports</a>');
replace('</head>', '<link rel="icon" type="image/png" sizes="64x64" href="data:image/png;base64,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"><style>html:not([data-signed-in]) .shell, html:not([data-signed-in]) .overlay, html:not([data-signed-in]) #lifexIntro{visibility:hidden}.user form{margin:0}.user form button{padding:6px 9px}.user [data-account-name]{overflow-wrap:anywhere}#auth-status{position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);text-align:center}#auth-status a{color:var(--cyan)}</style></head>');
replace('<div class="avatar">AR</div><div><b>Adharshini</b><div class="muted small">Engineering · Demo user</div></div>', '<div class="avatar" data-account-initials aria-hidden="true"></div><div><b data-account-name></b><div class="muted small">LifeX account</div></div><form method="post" action="/account/signout"><button class="outline">Sign out</button></form>');
replace("const reportStorage = 'lifex-reviewed-documents-v1';", "const reportStorage = 'lifex-reviewed-documents-v1:' + window.lifexAccountId;");
html = html.replaceAll("'lifex-last-document'", "'lifex-last-document:' + window.lifexAccountId");
replace('<script>\n', '<script type="application/json" id="lifex-workspace-script">\n');
replace('</body>', `<div id="auth-status" role="status">Checking your LifeX account…</div>
<script>
(async function () {
  addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  const status = document.getElementById('auth-status');
  try {
    const response = await fetch('/account/user', { cache: 'no-store' });
    if (response.status === 401) return location.replace('/account/start');
    if (!response.ok) throw new Error('Could not load your LifeX account.');
    const user = await response.json();
    window.lifexAccountId = user.id;
    document.querySelector('[data-account-name]').textContent = user.name;
    document.querySelector('[data-account-initials]').textContent = user.name.trim().split(/ +/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase();
    document.documentElement.dataset.signedIn = 'true';
    status.remove();
    const script = document.createElement('script');
    script.text = document.getElementById('lifex-workspace-script').textContent;
    document.body.appendChild(script);
  } catch {
    status.textContent = 'Could not load your LifeX account. ';
    const retry = document.createElement('a');
    retry.href = '/';
    retry.textContent = 'Try again';
    status.appendChild(retry);
  }
})();
</script></body>`);

replace('<div class="form-progress-wrap">', `<div id="knowledgeUpload" class="knowledge-upload">
  <label for="knowledgeDocument">Upload a document to autofill</label>
  <div class="knowledge-upload-controls"><input id="knowledgeDocument" type="file" accept=".docx,.pdf,.txt,.md" aria-describedby="knowledgeUploadHelp">
  <button class="knowledge-primary" id="autofillKnowledge" type="button">Autofill answers</button></div>
  <p id="knowledgeUploadHelp">Use the selected component code and label answers Q1–Q10. Word, PDF, TXT or Markdown, up to 4 MB.</p>
  <p id="knowledgeUploadStatus" role="status"></p>
</div><div class="form-progress-wrap">`);
replace('</head>', '<style>.knowledge-upload{margin:0 24px 12px;padding:12px 14px;border:1px solid #275368;background:#081923}.knowledge-upload label{display:block;font-weight:700;margin-bottom:8px}.knowledge-upload-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.knowledge-upload input{max-width:100%;color:#ccecf4}.knowledge-upload p{margin:7px 0 0;color:#a7c9d2;font-size:12px}.knowledge-upload p:empty{display:none}</style></head>');
replace('selectComponent(selectedPart);\n\n</script>', `selectComponent(selectedPart);
const knowledgeDocument=document.getElementById('knowledgeDocument');
const autofillKnowledge=document.getElementById('autofillKnowledge');
const knowledgeUploadStatus=document.getElementById('knowledgeUploadStatus');
autofillKnowledge.addEventListener('click',async()=>{
 const file=knowledgeDocument.files[0];
 if(!file || file.size>4*1024*1024){knowledgeUploadStatus.textContent='Choose a document up to 4 MB.';return;}
 const part=selectedPart;
 const fields=[...document.querySelectorAll('#knowledgeQuestionList textarea')];
 const form=new FormData();
 form.append('component',componentMeta[part].code);
 form.append('document',file);
 autofillKnowledge.disabled=true;
 knowledgeUploadStatus.textContent='Reading document…';
 try {
   const response=await fetch('/account/deposit-draft',{method:'POST',body:form});
   if(response.status===401){location.assign('/account/start');return;}
   if(response.status===413)throw new Error('Choose a document up to 4 MB.');
   const result=await response.json();
   if(!response.ok)throw new Error(result.error || 'The document could not be mapped.');
   if(part!==selectedPart || !knowledgeModal.classList.contains('show') || !fields.every(field=>field.isConnected))return;
   let filled=0, kept=0;
   fields.forEach((field,index)=>{
     const answer=result.answers[String(index+1)];
     if(!answer)return;
     if(field.value.trim()){kept++;return;}
     field.value=answer;
     field.dispatchEvent(new Event('input',{bubbles:true}));
     filled++;
   });
   knowledgeUploadStatus.textContent=filled+' of '+fields.length+' fields filled. '+(kept?kept+' existing answers kept. ':'')+'Review and save the deposit when ready.';
 }catch(error){
   knowledgeUploadStatus.textContent=error.message || 'The document could not be imported.';
 }finally{
   autofillKnowledge.disabled=false;
 }
});
document.getElementById('openKnowledgeForm').addEventListener('click',()=>{
 document.getElementById('knowledgeUploadHelp').textContent='Component code '+componentMeta[selectedPart].code+'. Label answers Q1–Q10. Word, PDF, TXT or Markdown, up to 4 MB.';
 knowledgeDocument.value='';
 knowledgeUploadStatus.textContent='';
});

</script>`);

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
for (const file of ['report-data.js', 'reports.css']) copyFileSync('scripts/' + file, 'dist/' + file);
