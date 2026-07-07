// ─────────────────────────────────────────────────────────────────────────────
// payments.js — Applicant Payments page (applicant_payments.html)
// All mock data removed. Real authFetch() call.
// Requires api-client.js to be loaded first.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const paymentsShell = document.querySelector('[data-applicant-payments]');
  const userNameNode  = document.getElementById('user-name');
  const paymentsBody  = document.getElementById('payments-body');
  const paymentCount  = document.getElementById('payment-count');

  if (!paymentsShell) return;

  const escapeHtml = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const getStatusClass = (s) => {
    const n = String(s || '').toLowerCase();
    return n === 'completed' ? 'status-completed' : n === 'pending' ? 'status-pending' : 'status-default';
  };

  const renderEmpty = (msg) => {
    if (paymentsBody)
      paymentsBody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(msg)}</td></tr>`;
  };

  try {
    const session = getSession('Applicant');
    if (!session) return;

    if (userNameNode) userNameNode.textContent = session.name || 'Applicant';

    const data = await authFetch('/api/applicant/payments');
    if (!data || data.status !== 'success') {
      renderEmpty('Unable to load payment records.');
      return;
    }

    const payments = Array.isArray(data.payments) ? data.payments : [];
    if (paymentCount) paymentCount.textContent = `${payments.length} record${payments.length === 1 ? '' : 's'}`;

    if (payments.length === 0) {
      renderEmpty('No payment history found.');
      return;
    }

    paymentsBody.innerHTML = payments.map((p) => `
      <tr>
        <td>${escapeHtml(p.sp_id)}</td>
        <td><span class="status-pill ${getStatusClass(p.p_status)}">${escapeHtml(p.p_status)}</span></td>
        <td>${escapeHtml(p.date)}</td>
        <td>${escapeHtml(p.payment)}</td>
        <td>${escapeHtml(p.gn_id)}</td>
      </tr>
    `).join('');

    if (typeof gsap !== 'undefined') {
      gsap.from('.payments-header',         { duration: 0.8, y: -22, opacity: 0, ease: 'power3.out' });
      gsap.from('.hero',                    { duration: 0.8, y: 24,  opacity: 0, delay: 0.08, ease: 'power3.out' });
      gsap.from('.table-card',              { duration: 0.8, y: 24,  opacity: 0, delay: 0.16, ease: 'power3.out' });
      gsap.from('.payments-table tbody tr', { duration: 0.6, x: -18, opacity: 0, stagger: 0.08, ease: 'power3.out' });
    }
  } catch {
    logout();
  }
});
