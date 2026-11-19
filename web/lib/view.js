const statuses = [
  ['Match', 'match'],
  ['Mismatch', 'mismatch'],
  ['Needs Review', 'review'],
  ['No offers displayed', 'no-offers'],
];

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function externalLink(url, label) {
  if (typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
  } catch {
    return '';
  }
  return `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-hidden="true">↗</span></a>`;
}

function evidenceUrl(reportId, file) {
  return `/reports/${encodeURIComponent(reportId)}/evidence/${encodeURIComponent(file)}`;
}

function evidenceLink(reportId, file, label) {
  return `<a href="${evidenceUrl(reportId, file)}" target="_blank" rel="noopener">${escape(label)} <span aria-hidden="true">↗</span></a>`;
}

function capturePanel(reportId, label, capture) {
  return `<section class="capture" aria-label="${escape(label)} findings">
    <h4>${escape(label)}</h4>
    <p>${escape(capture.finding)}</p>
    <blockquote>${capture.quotes.map(quote => `<p>“${escape(quote)}”</p>`).join('')}</blockquote>
    <div class="links">${externalLink(capture.sourceUrl, `Open ${label.toLowerCase()} source`)}
      ${capture.finalUrl && capture.finalUrl !== capture.sourceUrl ? externalLink(capture.finalUrl, 'Open observed destination') : ''}
      ${capture.captureFile ? evidenceLink(reportId, capture.captureFile, 'Capture record') : ''}
    </div>
    ${capture.screenshot ? `<figure>
      <a class="shot" href="${evidenceUrl(reportId, capture.screenshot.file)}" target="_blank" rel="noopener">
        <img src="${evidenceUrl(reportId, capture.screenshot.file)}" loading="lazy" decoding="async" alt="${escape(capture.screenshot.alt)}">
        <span>Open full screenshot <span aria-hidden="true">↗</span></span>
      </a>
      <figcaption>${escape(capture.screenshot.caption)}</figcaption>
    </figure>` : ''}
  </section>`;
}

function rowHtml(report, row) {
  const tone = statuses.find(([status]) => status === row.status)[1];
  const rowId = `details-${row.number}`;
  const subtitle = row.identity ? `Creative ${escape(row.creativeId)}` : `CSV row ${row.number}`;
  const identity = row.identity ? `<section class="${row.identity.issue ? 'identity-issue' : ''}">
    <h3>Creative ID check</h3><p>${escape(row.identity.note)}</p>
    <dl><div><dt>Inventory</dt><dd>${escape(row.creativeId)}</dd></div>
    <div><dt>Tracking <code>c=</code></dt><dd>${escape(row.identity.requested)}</dd></div></dl>
  </section>` : '';

  return `<tr class="result-row" data-report-row="${row.number}">
    <th scope="row"><span class="creative-name">${escape(row.name)}</span><span class="creative-id">${subtitle}</span></th>
    <td class="result-cell"><span class="status ${tone}"><span aria-hidden="true"></span>${escape(row.status)}</span></td>
    <td class="reason">${escape(row.reason)}</td>
    <td class="toggle-cell"><button class="toggle" type="button" aria-expanded="false" aria-controls="${rowId}" aria-label="Show details for ${escape(row.name)}">
      <span class="toggle-label">Details</span><span class="chevron" aria-hidden="true"></span>
    </button></td>
  </tr>
  <tr id="${rowId}" class="detail-row" hidden><td colspan="4">
    <div class="details">
      <div class="findings${row.identity ? '' : ' content-only'}">
        <section><h3>Content findings</h3><p>${escape(row.contentFinding)}</p></section>
        ${identity}
      </div>
      <div class="captures">
        ${capturePanel(report.id, 'Vanity', report.captures[row.vanityCapture])}
        ${capturePanel(report.id, 'Tracking', report.captures[row.trackingCapture])}
      </div>
    </div>
  </td></tr>`;
}

export function renderReport(report) {
  if (!report.rows.length || report.rows.some(row => !statuses.some(([status]) => status === row.status)
      || !Number.isSafeInteger(row.number))) throw new Error('Invalid report rows.');
  const counts = statuses.map(([status, tone]) => ({
    status, tone, count: report.rows.filter(row => row.status === status).length,
  }));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(report.name)} | Scout</title>
  <link rel="stylesheet" href="/report.css">
  <script src="/report.js" defer></script>
</head>
<body>
  <a class="skip" href="#results">Skip to results</a>
  <header class="brand-bar"><div class="shell brand"><span class="brand-mark" aria-hidden="true"></span>Scout</div></header>
  <main class="shell">
    <header class="report-heading">
      <h1>${escape(report.name)}</h1>
      <p class="metadata"><time datetime="${escape(report.date)}">${escape(report.displayDate)}</time><span>${escape(report.scope)}</span></p>
    </header>
    <section aria-label="Audit summary" class="summary">
      ${counts.map(({ status, tone, count }) => `<div class="summary-count ${tone}" data-count-for="${escape(status)}">
        <span class="summary-label"><span aria-hidden="true"></span>${escape(status)}</span><strong>${count}</strong>
      </div>`).join('')}
    </section>
    <section id="results" aria-labelledby="results-title" class="results-section">
      <div class="section-heading"><h2 id="results-title">Creative results</h2><span>${report.rows.length} creatives</span></div>
      <div class="table-shell">
        <table aria-labelledby="results-title">
          <thead><tr><th scope="col">Creative</th><th scope="col">Status</th><th scope="col">Explanation</th><th scope="col"><span class="sr-only">Evidence details</span></th></tr></thead>
          <tbody>${report.rows.map(row => rowHtml(report, row)).join('')}</tbody>
        </table>
      </div>
    </section>
    <section aria-labelledby="scope-title" class="scope">
      <h2 id="scope-title">Scope and evidence</h2>
      <ul>${report.limitations.map(note => `<li>${escape(note)}</li>`).join('')}</ul>
      <div class="links">${report.documents.map(doc => evidenceLink(report.id, doc.file, doc.label)).join('')}</div>
    </section>
  </main>
</body>
</html>`;
}
