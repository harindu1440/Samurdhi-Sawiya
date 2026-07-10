// ─────────────────────────────────────────────────────────────────────────────
// app.js — Applicant payments page + GN Dashboard + Apply Benefit form
// All mock data and setTimeout fakes removed. Real fetch() calls via authFetch().
// Requires api-client.js to be loaded first.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const benefitForm        = document.getElementById('benefit-form');
  const gnDashboard        = document.querySelector('[data-gn-dashboard]');
  const applicantPayments  = document.querySelector('[data-applicant-payments]');

  // ══════════════════════════════════════════════════════════════════════════
  // APPLICANT PAYMENTS PAGE
  // ══════════════════════════════════════════════════════════════════════════
  if (applicantPayments) {
    const userNameNode  = document.getElementById('user-name');
    const paymentsBody  = document.getElementById('payments-body');
    const paymentCount  = document.getElementById('payment-count');

    const escapeHtml = (v) => String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const getStatusClass = (s) => {
      const n = String(s || '').toLowerCase();
      return n === 'completed' ? 'status-completed' : n === 'pending' ? 'status-pending' : 'status-default';
    };

    const renderEmpty = (msg) => {
      if (paymentsBody) paymentsBody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(msg)}</td></tr>`;
    };

    try {
      // Validate session
      const session = getSession('Applicant');
      if (!session) return;

      if (userNameNode) userNameNode.textContent = session.name || 'Applicant';

      // Fetch real payments from API
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
        gsap.from('.payments-header', { duration: 0.8, y: -22, opacity: 0, ease: 'power3.out' });
        gsap.from('.hero',            { duration: 0.8, y: 24,  opacity: 0, delay: 0.08, ease: 'power3.out' });
        gsap.from('.table-card',      { duration: 0.8, y: 24,  opacity: 0, delay: 0.16, ease: 'power3.out' });
        gsap.from('.payments-table tbody tr', { duration: 0.6, x: -18, opacity: 0, stagger: 0.08, ease: 'power3.out' });
      }
    } catch {
      logout();
    }
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GN DASHBOARD PAGE
  // ══════════════════════════════════════════════════════════════════════════
  if (gnDashboard) {
    const userNameNode            = document.getElementById('user-name');
    const totalApplicationsNode   = document.getElementById('total-applications');
    const pendingGnApprovalsNode  = document.getElementById('pending-gn-approvals');
    const pendingApplicationsBody = document.getElementById('pending-applications-body');

    const escapeHtml = (v) => String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const renderEmptyTable = (msg) => {
      if (pendingApplicationsBody)
        pendingApplicationsBody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(msg)}</td></tr>`;
    };

    try {
      const session = getSession('Grama_Niladhari');
      if (!session) return;

      if (userNameNode) userNameNode.textContent = session.name || 'Grama Niladhari';

      const data = await authFetch('/api/gn/stats');
      if (!data || data.status !== 'success') {
        renderEmptyTable('Unable to load data.');
        return;
      }

      if (totalApplicationsNode)  totalApplicationsNode.textContent  = String(data.stats?.total_applications  ?? 0);
      if (pendingGnApprovalsNode) pendingGnApprovalsNode.textContent = String(data.stats?.pending_gn_approvals ?? 0);

      const pending = Array.isArray(data.pending_applications) ? data.pending_applications : [];
      if (pending.length === 0) {
        renderEmptyTable('No pending GN approvals found.');
      } else {
        pendingApplicationsBody.innerHTML = pending.map((a) => `
          <tr>
            <td>${escapeHtml(a.application_id)}</td>
            <td>${escapeHtml(a.applicant_name)}</td>
            <td>${escapeHtml(a.date)}</td>
            <td><span class="status-pill">${escapeHtml(a.status)}</span></td>
            <td>${escapeHtml(a.monthly_income)}</td>
          </tr>
        `).join('');
      }

      if (typeof gsap !== 'undefined') {
        gsap.from('.metric-card', { duration: 0.9, opacity: 0, y: 28, scale: 0.82, stagger: 0.16, ease: 'bounce.out' });
        gsap.from('.table-wrap',  { duration: 0.8, opacity: 0, y: 16, delay: 0.2,  ease: 'power3.out' });
      }
    } catch {
      logout();
    }
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // APPLY BENEFIT FORM PAGE
  // ══════════════════════════════════════════════════════════════════════════
  if (!benefitForm) return;

  const errorBox        = document.getElementById('error-box');
  const successBox      = document.getElementById('success-box');
  const submitButton    = benefitForm.querySelector('.submit-button');
  const dashboardRedirect = 'applicant_dashboard.html';

  const clearMessages = () => {
    if (errorBox)   { errorBox.hidden = true;   errorBox.innerHTML = ''; }
    if (successBox) { successBox.hidden = true; }
  };

  const escapeHtml = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const renderErrors = (errors) => {
    if (!errorBox) return;
    const items = Array.isArray(errors) ? errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('') : `<li>${escapeHtml(errors)}</li>`;
    errorBox.innerHTML = `<strong>Please correct the following:</strong><ul>${items}</ul>`;
    errorBox.hidden = false;
  };

  const setLoadingState = (isLoading) => {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.classList.toggle('is-loading', isLoading);
    submitButton.querySelector('.button-label').textContent = isLoading ? 'Submitting...' : 'Submit Application';
  };

  const showSuccess = () => {
    if (!successBox) { window.location.href = dashboardRedirect; return; }
    successBox.hidden = false;
    if (typeof gsap !== 'undefined') {
      gsap.fromTo('.success-box',  { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.8)' });
      gsap.fromTo('.success-icon', { scale: 0.4, rotate: -18, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.7, delay: 0.1, ease: 'elastic.out(1, 0.6)' });
    }
    window.setTimeout(() => { window.location.href = dashboardRedirect; }, 1600);
  };

  // Verify session on load
  const session = getSession('Applicant');
  if (!session) return;

  if (typeof gsap !== 'undefined') {
    gsap.from('.benefit-panel', { duration: 0.9, x: -44, opacity: 0, ease: 'power3.out' });
    gsap.from('.form-card',     { duration: 0.9, x: 44,  opacity: 0, delay: 0.1, ease: 'power3.out' });
  }

  benefitForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessages();

    const formData       = new FormData(benefitForm);
    const monthlyIncome  = String(formData.get('monthly_income') || '').trim();
    const familySize     = String(formData.get('family_size')    || '').trim();
    const housePhoto     = formData.get('house_photo');

    const validationErrors = [];

    if (monthlyIncome === '' || isNaN(Number(monthlyIncome)) || Number(monthlyIncome) < 0) {
      validationErrors.push('Monthly Income must be a valid non-negative number.');
    }
    if (familySize === '' || !Number.isInteger(Number(familySize)) || Number(familySize) < 1) {
      validationErrors.push('Family Size must be a whole number of at least 1.');
    }
    if (!(housePhoto instanceof File) || housePhoto.size === 0) {
      validationErrors.push('Please upload a house photo.');
    } else {
      const allowed = ['image/jpeg', 'image/png'];
      const ext     = housePhoto.name.toLowerCase().split('.').pop();
      if (!allowed.includes(housePhoto.type) && !['jpg','jpeg','png'].includes(ext)) {
        validationErrors.push('House photo must be a JPG or PNG file.');
      }
    }

    if (validationErrors.length > 0) { renderErrors(validationErrors); return; }

    setLoadingState(true);

    try {
      // Use FormData directly — multer on the server handles multipart
      const uploadPayload = new FormData();
      uploadPayload.append('monthly_income', monthlyIncome);
      uploadPayload.append('family_size', familySize);
      uploadPayload.append('house_photo', housePhoto);

      const data = await authFetch('/api/applications/submit', {
        method: 'POST',
        body:   uploadPayload,
        // Content-Type is NOT set — authFetch auto-removes it for FormData
      });

      if (!data || data.status !== 'success') {
        throw new Error(data?.message || 'Submission failed. Please try again.');
      }

      setLoadingState(false);
      showSuccess();
    } catch (err) {
      setLoadingState(false);
      renderErrors([err.message || 'Unable to submit application.']);
    }
  });
});
