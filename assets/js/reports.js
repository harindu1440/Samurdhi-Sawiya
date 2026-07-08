// ─────────────────────────────────────────────────────────────────────────────
// reports.js — Admin Reports page
// All mock data and setTimeout fakes removed. Real authFetch() call.
// Requires api-client.js to be loaded first.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const page             = document.querySelector('[data-reports-page]');
  const adminNameNode    = document.getElementById('admin-name');
  const reportForm       = document.getElementById('report-form');
  const startDateInput   = document.getElementById('start-date');
  const endDateInput     = document.getElementById('end-date');
  const reportStatus     = document.getElementById('report-status');
  const reportBody       = document.getElementById('report-body');
  const recordCountNode  = document.getElementById('record-count');
  const downloadButton   = document.getElementById('generate-report-button');

  if (!page) return;

  const escapeHtml = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const setStatus = (msg) => { if (reportStatus) reportStatus.textContent = msg; };

  const renderRows = (records) => {
    if (!reportBody) return;
    if (!Array.isArray(records) || records.length === 0) {
      reportBody.innerHTML = `<tr><td colspan="9" class="empty-state">No approved applications or payments were found for this date range.</td></tr>`;
      if (recordCountNode) recordCountNode.textContent = '0 records';
      return;
    }
    reportBody.innerHTML = records.map((r) => `
      <tr>
        <td>${escapeHtml(r.application_id)}</td>
        <td>${escapeHtml(r.applicant_name)}</td>
        <td>${escapeHtml(r.applicant_id)}</td>
        <td>${escapeHtml(r.application_date)}</td>
        <td>${escapeHtml(r.application_status)}</td>
        <td>${escapeHtml(r.payment_id        || '')}</td>
        <td>${escapeHtml(r.payment_date      || '')}</td>
        <td>${escapeHtml(r.payment_amount    || '')}</td>
        <td>${escapeHtml(r.division          || '')}</td>
      </tr>
    `).join('');
    if (recordCountNode) recordCountNode.textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;
    if (typeof gsap !== 'undefined') {
      gsap.from('.report-table tbody tr', { duration: 0.55, opacity: 0, y: 12, stagger: 0.04, ease: 'power2.out' });
    }
  };

  const createWorkbook = (records, summary) => {
    if (typeof XLSX === 'undefined') throw new Error('SheetJS is not available.');
    const dataRows = records.map((r) => ({
      'Application ID':    r.application_id,
      'Applicant Name':    r.applicant_name,
      'Applicant ID':      r.applicant_id,
      'Application Date':  r.application_date,
      'Application Status': r.application_status,
      'Monthly Income':    r.monthly_income,
      'Family Size':       r.family_size,
      'Payment ID':        r.payment_id,
      'Payment Date':      r.payment_date,
      'Payment Amount':    r.payment_amount,
      'Payment Status':    r.payment_status,
      'GN ID':             r.gn_id,
      'GN Name':           r.gn_name,
      'Division':          r.division,
      'Applicant Address': r.applicant_address,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataRows), 'Audit Records');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Metric: 'Approved Applications',  Value: summary.approved_applications },
      { Metric: 'Payment Rows',           Value: summary.payment_rows },
      { Metric: 'Total Payment Amount',   Value: summary.total_payment_amount },
      { Metric: 'Start Date',             Value: summary.start_date },
      { Metric: 'End Date',               Value: summary.end_date },
    ]), 'Summary');
    return wb;
  };

  const downloadWorkbook = (wb, startDate, endDate) => {
    XLSX.writeFile(wb, `SamurdhiSaviya_Report_${startDate}_to_${endDate}.xlsx`, { compression: true });
  };

  reportForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const startDate = String(startDateInput?.value || '');
    const endDate   = String(endDateInput?.value   || '');

    if (!startDate || !endDate) { window.alert('Please provide both start and end dates.'); return; }
    if (startDate > endDate)    { window.alert('Start Date cannot be later than End Date.'); return; }

    if (downloadButton) downloadButton.disabled = true;

    setStatus('Generating...');
    try {
      const data = await authFetch(`/api/admin/reports?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`);
      if (!data || data.status !== 'success') throw new Error(data?.message || 'Report generation failed.');

      const records = Array.isArray(data.records) ? data.records : [];
      const summary = data.summary || {};

      renderRows(records);

      if (records.length > 0) {
        const wb = createWorkbook(records, summary);
        downloadWorkbook(wb, startDate, endDate);
      }

      setStatus('Exported');
    } catch (err) {
      setStatus('Ready');
      window.alert(err.message || 'Unable to generate report.');
    } finally {
      if (downloadButton) downloadButton.disabled = false;
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  try {
    const session = getSession('Minister');
    if (!session) return;

    if (adminNameNode) adminNameNode.textContent = session.name || 'Minister';

    if (typeof gsap !== 'undefined') {
      gsap.from('.sidebar', { duration: 0.8, x: -28, opacity: 0, ease: 'power3.out' });
      gsap.from('.topbar',  { duration: 0.8, y: -20, opacity: 0, delay: 0.08, ease: 'power3.out' });
      gsap.from('.panel',   { duration: 0.8, y: 24,  opacity: 0, delay: 0.16, ease: 'power3.out' });
    }
  } catch {
    logout();
  }
});
