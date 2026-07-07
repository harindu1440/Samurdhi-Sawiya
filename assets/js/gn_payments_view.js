// ─────────────────────────────────────────────────────────────────────────────
// gn_payments_view.js — GN Payments page
// All mock data removed. Real authFetch() call to /api/gn/payments.
// Requires api-client.js to be loaded first.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const paymentsShell = document.querySelector('[data-gn-payments]');
  const userNameNode  = document.getElementById('user-name');
  const divisionChip  = document.getElementById('division-chip');
  const paymentCount  = document.getElementById('payment-count');
  const paymentsBody  = document.getElementById('payments-body');
  const searchInput   = document.getElementById('payment-search');

  if (!paymentsShell) return;

  let loadedRows = [];

  const escapeHtml = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const getStatusClass = (s) => {
    const n = String(s || '').toLowerCase();
    return n === 'completed' ? 'status-completed' : n === 'pending' ? 'status-pending' : 'status-default';
  };

  const renderRows = (rows) => {
    if (!paymentsBody) return;
    if (!Array.isArray(rows) || rows.length === 0) {
      paymentsBody.innerHTML = `<tr><td colspan="6" class="empty-state">No payment records found.</td></tr>`;
      return;
    }
    paymentsBody.innerHTML = rows.map((p) => `
      <tr>
        <td>${escapeHtml(p.sp_id)}</td>
        <td>${escapeHtml(p.applicant_id)}</td>
        <td>${escapeHtml(p.applicant_name)}</td>
        <td><span class="status-pill ${getStatusClass(p.p_status)}">${escapeHtml(p.p_status)}</span></td>
        <td>${escapeHtml(p.date)}</td>
        <td>${escapeHtml(p.payment)}</td>
      </tr>
    `).join('');

    if (typeof gsap !== 'undefined') {
      gsap.from('.payments-table tbody tr', { duration: 0.6, x: -18, opacity: 0, stagger: 0.08, ease: 'power3.out' });
    }
  };

  window.filterPayments = () => {
    const query = String(searchInput?.value || '').trim().toLowerCase();
    if (!query) { renderRows(loadedRows); return; }
    const filtered = loadedRows.filter((p) =>
      String(p.applicant_name || '').toLowerCase().includes(query) ||
      String(p.applicant_id   || '').toLowerCase().includes(query)
    );
    renderRows(filtered);
  };

  try {
    const session = getSession('Grama Niladhari');
    if (!session) return;

    if (userNameNode) userNameNode.textContent = session.name || 'Grama Niladhari';

    const data = await authFetch('/api/gn/payments');
    if (!data || data.status !== 'success') {
      renderRows([]);
      return;
    }

    if (divisionChip) divisionChip.textContent = `Division: ${data.division || 'Unassigned'}`;

    loadedRows = Array.isArray(data.payments) ? data.payments : [];
    if (paymentCount) paymentCount.textContent = `${loadedRows.length} record${loadedRows.length === 1 ? '' : 's'}`;

    renderRows(loadedRows);

    if (typeof gsap !== 'undefined') {
      gsap.from('.payments-header', { duration: 0.8, y: -22, opacity: 0, ease: 'power3.out' });
      gsap.from('.hero',            { duration: 0.8, y: 24,  opacity: 0, delay: 0.08, ease: 'power3.out' });
      gsap.from('.table-card',      { duration: 0.8, y: 24,  opacity: 0, delay: 0.16, ease: 'power3.out' });
    }
  } catch {
    logout();
  }
});
