// ─────────────────────────────────────────────────────────────────────────────
// applicant_dashboard.js — Applicant dashboard landing page
// Mock session removed. Reads name from JWT via getSession().
// Requires api-client.js to be loaded first.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const userNameNode = document.getElementById('user-name');
  const cards        = document.querySelectorAll('.action-card');

  try {
    const session = getSession('Applicant');
    if (!session) return;

    if (userNameNode) userNameNode.textContent = session.name || 'Applicant';
  } catch {
    logout();
    return;
  }

  if (typeof gsap !== 'undefined') {
    gsap.from('.dashboard-header', { duration: 0.8, y: -24, opacity: 0, ease: 'power3.out' });
    gsap.from('.dashboard-hero',   { duration: 0.8, y: 26,  opacity: 0, delay: 0.1,  ease: 'power3.out' });
    gsap.from(cards,               { duration: 0.8, y: 30,  opacity: 0, stagger: 0.14, delay: 0.22, ease: 'power3.out' });
  }
});
