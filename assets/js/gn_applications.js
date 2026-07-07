// ─────────────────────────────────────────────────────────────────────────────
// gn_applications.js — GN Applications list + review modal
// All mock data and setTimeout fakes removed. Real authFetch() calls.
// Requires api-client.js to be loaded first.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const applicationsBody = document.getElementById('applications-body');
  const applicationCount = document.getElementById('application-count');
  const divisionChip     = document.getElementById('division-chip');
  const userNameNode     = document.getElementById('user-name');
  const modalOverlay     = document.getElementById('review-modal');
  const modalDialog      = modalOverlay ? modalOverlay.querySelector('.modal-dialog') : null;
  const modalClose       = document.getElementById('modal-close');
  const modalLoading     = document.getElementById('modal-loading');
  const modalContent     = document.getElementById('modal-content');
  const modalError       = document.getElementById('modal-error');
  const approveButton    = document.getElementById('approve-button');
  const rejectButton     = document.getElementById('reject-button');
  const detailName       = document.getElementById('detail-name');
  const detailAddress    = document.getElementById('detail-address');
  const detailPhone      = document.getElementById('detail-phone');
  const detailIncome     = document.getElementById('detail-income');
  const detailFamilySize = document.getElementById('detail-family-size');
  const detailDate       = document.getElementById('detail-date');
  const detailPhoto      = document.getElementById('detail-photo');
  const modalStatus      = document.getElementById('modal-status');

  let selectedApplicationId = null;
  let currentApplications   = [];

  const escapeHtml = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const setModalError = (msg) => { if (modalError) { modalError.textContent = msg; modalError.hidden = false; } };
  const clearModalError = () => { if (modalError) { modalError.hidden = true; modalError.textContent = ''; } };

  const openModal = () => {
    if (!modalOverlay || !modalDialog) return;
    modalOverlay.classList.add('is-open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(modalDialog, { scale: 0.84, opacity: 0, y: 24 }, { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    } else {
      modalDialog.style.opacity = '1';
      modalDialog.style.transform = 'scale(1)';
    }
  };

  const closeModal = () => {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('is-open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    clearModalError();
  };

  const renderTable = (apps) => {
    if (!applicationsBody) return;
    if (!Array.isArray(apps) || apps.length === 0) {
      applicationsBody.innerHTML = `<tr><td colspan="5" class="empty-state">No applications currently assigned to your division.</td></tr>`;
      return;
    }
    applicationsBody.innerHTML = apps.map((a) => `
      <tr>
        <td>${escapeHtml(a.application_id)}</td>
        <td>${escapeHtml(a.applicant_name)}</td>
        <td>${escapeHtml(a.submitted_date)}</td>
        <td><span class="status-pill">${escapeHtml(a.status)}</span></td>
        <td><button type="button" class="review-trigger" data-application-id="${escapeHtml(a.application_id)}">Review</button></td>
      </tr>
    `).join('');
  };

  const loadApplications = async () => {
    if (!applicationsBody) return [];
    const data = await authFetch('/api/gn/applications');
    if (!data || data.status !== 'success') {
      applicationsBody.innerHTML = `<tr><td colspan="5" class="empty-state">Unable to load applications.</td></tr>`;
      return [];
    }
    if (divisionChip) divisionChip.textContent = `Division: ${data.division || 'Unassigned'}`;
    currentApplications = Array.isArray(data.applications) ? data.applications : [];
    if (applicationCount) applicationCount.textContent = `${currentApplications.length} record${currentApplications.length === 1 ? '' : 's'}`;
    renderTable(currentApplications);
    return currentApplications;
  };

  const loadApplicationDetails = async (applicationId) => {
    const data = await authFetch(`/api/gn/applications/${applicationId}`);
    if (!data || data.status !== 'success') throw new Error(data?.message || 'Unable to load application details.');
    return data.application;
  };

  const showLoading = (isLoading) => {
    if (modalLoading) modalLoading.hidden = !isLoading;
    if (modalContent) modalContent.hidden =  isLoading;
  };

  const fillModal = (app) => {
    selectedApplicationId = app.application_id;
    clearModalError();
    if (detailName)       detailName.textContent       = app.applicant_name  || '-';
    if (detailAddress)    detailAddress.textContent    = app.address          || '-';
    if (detailPhone)      detailPhone.textContent      = app.phone_num        || '-';
    if (detailIncome)     detailIncome.textContent     = app.monthly_income   || '-';
    if (detailFamilySize) detailFamilySize.textContent = String(app.family_size ?? '-');
    if (detailDate)       detailDate.textContent       = app.submitted_date   || '-';
    if (modalStatus)      modalStatus.textContent      = app.status           || 'Pending';
    if (detailPhoto) {
      detailPhoto.src = app.house_photo_url || '';
      detailPhoto.alt = app.applicant_name ? `${app.applicant_name} house photograph` : 'Uploaded house photograph';
    }
  };

  const openApplication = async (applicationId) => {
    showLoading(true);
    openModal();
    try {
      const app = await loadApplicationDetails(applicationId);
      fillModal(app);
      showLoading(false);
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(modalContent, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
      }
    } catch (err) {
      showLoading(false);
      setModalError(err.message || 'Unable to load application details.');
    }
  };

  const reviewApplication = async (action) => {
    if (!selectedApplicationId) return;
    if (approveButton) approveButton.disabled = true;
    if (rejectButton)  rejectButton.disabled  = true;
    clearModalError();

    try {
      const data = await authFetch('/api/gn/review', {
        method: 'POST',
        body:   JSON.stringify({ application_id: selectedApplicationId, action }),
      });

      if (!data || data.status !== 'success') throw new Error(data?.message || 'Review failed.');

      closeModal();
      await loadApplications(); // Refresh table
    } catch (err) {
      setModalError(err.message || 'Unable to process review.');
    } finally {
      if (approveButton) approveButton.disabled = false;
      if (rejectButton)  rejectButton.disabled  = false;
    }
  };

  // ── Event listeners ───────────────────────────────────────────────────────
  if (modalClose)   modalClose.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  if (approveButton) approveButton.addEventListener('click', () => reviewApplication('approve'));
  if (rejectButton)  rejectButton.addEventListener('click',  () => reviewApplication('reject'));

  if (applicationsBody) {
    applicationsBody.addEventListener('click', (e) => {
      const trigger = e.target.closest('.review-trigger');
      if (!trigger) return;
      const id = trigger.getAttribute('data-application-id');
      if (id) openApplication(id);
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  try {
    const session = getSession('Grama Niladhari');
    if (!session) return;

    if (userNameNode) userNameNode.textContent = session.name || 'Grama Niladhari';

    const apps = await loadApplications();

    if (typeof gsap !== 'undefined') {
      gsap.from('.gn-app-header', { duration: 0.8, y: -24, opacity: 0, ease: 'power3.out' });
      gsap.from('.hero',          { duration: 0.8, y: 24,  opacity: 0, delay: 0.1,  ease: 'power3.out' });
      gsap.from('.table-card',    { duration: 0.8, y: 24,  opacity: 0, delay: 0.2,  ease: 'power3.out' });
      if (apps.length > 0) {
        gsap.from('.review-trigger', { duration: 0.8, scale: 0.6, opacity: 0, stagger: 0.08, delay: 0.28, ease: 'back.out(1.7)' });
      }
    }
  } catch {
    logout();
  }
});
