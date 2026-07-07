// ─────────────────────────────────────────────────────────────────────────────
// record_visit.js — Record Home Visit page (officer)
// All mock data and setTimeout fakes removed. Real authFetch() call.
// Requires api-client.js to be loaded first.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const formElement       = document.getElementById('visit-form');
  const toastNode         = document.getElementById('toast');
  const errorBox          = document.getElementById('error-box');
  const submitButton      = formElement ? formElement.querySelector('.submit-button') : null;
  const applicantIdInput  = document.getElementById('applicant_id');
  const params            = new URLSearchParams(window.location.search);
  const applicantIdFromUrl = params.get('applicant_id') || '';
  const officerDashboard  = 'officer_dashboard.html';

  if (!formElement) return;

  if (applicantIdInput) applicantIdInput.value = applicantIdFromUrl;

  const escapeHtml = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const showError = (msg) => {
    if (!errorBox) return;
    errorBox.innerHTML = escapeHtml(msg);
    errorBox.hidden = false;
  };

  const clearError = () => { if (errorBox) { errorBox.hidden = true; errorBox.innerHTML = ''; } };

  const showToast = (msg) => {
    if (!toastNode) { window.location.href = officerDashboard; return; }
    toastNode.innerHTML = `
      <div class="toast-icon"><i class="fa-solid fa-circle-check"></i></div>
      <div><strong>Visit recorded</strong><p>${escapeHtml(msg)}</p></div>
    `;
    toastNode.hidden = false;
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(toastNode, { opacity: 0, scale: 0.88, y: 18 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    }
    window.setTimeout(() => { window.location.href = officerDashboard; }, 1700);
  };

  const setLoadingState = (isLoading) => {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.classList.toggle('is-loading', isLoading);
    submitButton.querySelector('.button-label').textContent = isLoading ? 'Submitting...' : 'Submit Visit';
  };

  // Validate session
  const session = getSession('Samurdhi Officer');
  if (!session) return;

  if (typeof gsap !== 'undefined') {
    gsap.from('.visit-panel', { duration: 0.8, x: -40, opacity: 0, ease: 'power3.out' });
    gsap.from('.form-card',   { duration: 0.8, x: 40,  opacity: 0, delay: 0.08, ease: 'power3.out' });
  }

  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const formData      = new FormData(formElement);
    const applicantId   = String(formData.get('applicant_id')  || applicantIdFromUrl || '').trim();
    const visitDate     = String(formData.get('visit_date')     || '').trim();
    const remarks       = String(formData.get('remarks')        || '').trim();
    const recommendation = String(formData.get('recommendation') || '').trim();

    const validationErrors = [];
    if (!applicantId || isNaN(Number(applicantId)) || Number(applicantId) < 1)
      validationErrors.push('A valid Applicant ID is required.');
    if (!visitDate)
      validationErrors.push('Visit Date is required.');
    if (remarks.length < 10)
      validationErrors.push('Remarks should contain at least 10 characters.');
    if (!['Highly Recommended', 'Recommended', 'Not Recommended'].includes(recommendation))
      validationErrors.push('Please select a valid recommendation.');

    if (validationErrors.length > 0) { showError(validationErrors.join(' ')); return; }

    setLoadingState(true);

    try {
      const data = await authFetch('/api/officer/visit', {
        method: 'POST',
        body:   JSON.stringify({ applicant_id: applicantId, visit_date: visitDate, remarks, recommendation }),
      });

      if (!data || data.status !== 'success') throw new Error(data?.message || 'Submission failed.');

      setLoadingState(false);
      showToast('Home visit saved successfully.');
    } catch (err) {
      setLoadingState(false);
      showError(err.message || 'Unable to submit visit record.');
    }
  });
});
