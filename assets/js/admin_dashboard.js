// ─────────────────────────────────────────────────────────────────────────────
// admin_dashboard.js — Admin Dashboard page
// All mock data removed. Real authFetch() call to /api/admin/stats.
// Requires api-client.js to be loaded first.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const dashboard       = document.querySelector('[data-admin-dashboard]');
  const adminNameNode   = document.getElementById('admin-name');
  const lastUpdatedNode = document.getElementById('last-updated');
  const beneficiaryNode = document.querySelector('[data-counter="beneficiaries"]');
  const fundsNode       = document.querySelector('[data-counter="funds"]');
  const approvalsNode   = document.querySelector('[data-counter="approvals"]');

  if (!dashboard) return;

  const animateCounter = (element, targetValue, formatter) => {
    if (!element) return;
    if (typeof gsap === 'undefined') { element.textContent = formatter(targetValue); return; }
    const state = { value: 0 };
    gsap.to(state, {
      value: targetValue, duration: 1.8, ease: 'power2.out',
      onUpdate: () => { element.textContent = formatter(state.value); }
    });
  };

  try {
    const session = getSession('Minister');
    if (!session) return;

    if (adminNameNode) adminNameNode.textContent = session.name || 'Minister';

    const data = await authFetch('/api/admin/stats');
    if (!data || data.status !== 'success') return;

    const m = data.metrics || {};
    animateCounter(beneficiaryNode, Number(m.total_beneficiaries   || 0), (v) => Math.round(v).toLocaleString());
    animateCounter(fundsNode,       Number(m.total_funds_disbursed || 0), (v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    animateCounter(approvalsNode,   Number(m.pending_approvals     || 0), (v) => Math.round(v).toLocaleString());

    if (lastUpdatedNode) {
      lastUpdatedNode.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (typeof gsap !== 'undefined') {
      gsap.from('.sidebar',      { duration: 0.8, x: -28, opacity: 0, ease: 'power3.out' });
      gsap.from('.topbar',       { duration: 0.8, y: -20, opacity: 0, delay: 0.08, ease: 'power3.out' });
      gsap.from('.metric-card',  { duration: 0.8, y: 24,  opacity: 0, stagger: 0.12, delay: 0.16, ease: 'power3.out' });
      gsap.from('.panel',        { duration: 0.8, y: 24,  opacity: 0, delay: 0.34, ease: 'power3.out' });
    }
  } catch {
    logout();
  }
});
