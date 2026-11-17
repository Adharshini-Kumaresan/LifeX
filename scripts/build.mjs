import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

let html = readFileSync('index.html', 'utf8');
function replace(original, replacement) {
  if (!html.includes(original)) throw new Error('Missing LifeX markup: ' + original.slice(0, 100));
  html = html.replace(original, () => replacement);
}
replace('</head>', '<link rel="stylesheet" href="/reports.css"></head>');
replace('<span class="ico">◷</span> Review history', '<span class="ico">◷</span> Project repositories');
replace('Both meeting and email</button>', 'Both meeting and email</button><button class="option" data-value="teams">Microsoft Teams chat</button>');
replace('  </div>\n  <div class="modalfoot"><div class="step">', `   <div class="q"><div class="qtitle">5. Who should this learning be useful to?</div><div class="options" data-q="scope">
   <button class="option" data-value="Personal learning">Personal learning</button><button class="option" data-value="Colleagues">Colleagues</button><button class="option" data-value="Project team">Project team</button><button class="option" data-value="Global">Global</button></div></div>
  </div>
  <div class="modalfoot"><div class="step">`);
replace("['decision','change','evidence','impact']", "['decision','change','evidence','impact','scope']");
replace('all four questions', 'all five questions');
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
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
for (const file of ['report-data.js', 'reports.css']) copyFileSync('scripts/' + file, 'dist/' + file);
