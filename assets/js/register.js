// ─────────────────────────────────────────────────────────────────────────────
// register.js — Applicant Self-Registration + Welfare Application Submission
// Validates form, sends POST to /api/auth/register, handles success/error.
// Does NOT require api-client.js — this is a fully public page.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const form            = document.getElementById('register-form');
  const errorBox        = document.getElementById('error-box');
  const successBox      = document.getElementById('success-box');
  const successMessage  = document.getElementById('success-message');
  const registerBtn     = document.getElementById('register-btn');
  const passwordInput   = document.getElementById('password');
  const strengthBar     = document.getElementById('strength-bar');
  const housePhotoInput = document.getElementById('housePhoto');
  const housePhotoLabel = document.getElementById('housePhoto-label');
  const housePhotoChosen = document.getElementById('housePhoto-chosen');

  if (!form) return;

  // ── GSAP entrance animations ──────────────────────────────────────────────
  if (typeof gsap !== 'undefined') {
    gsap.from('.auth-visual', {
      duration: 0.95, x: -48, opacity: 0, ease: 'power3.out'
    });
    gsap.from('.auth-card', {
      duration: 0.95, x: 56, opacity: 0, delay: 0.1, ease: 'power3.out'
    });
    gsap.from('.auth-card-header, .auth-form, .auth-footer-note', {
      duration: 0.75, y: 22, opacity: 0, delay: 0.25, stagger: 0.12, ease: 'power2.out'
    });
  }

  // ── Live password strength indicator ──────────────────────────────────────
  passwordInput?.addEventListener('input', () => {
    const val = passwordInput.value;
    if (!strengthBar) return;

    strengthBar.className = 'password-strength-bar'; // reset

    if (val.length === 0) {
      strengthBar.style.width = '0%';
    } else if (val.length < 8) {
      strengthBar.classList.add('strength-weak');
    } else if (val.length < 12 || !/[A-Z]/.test(val) || !/[0-9]/.test(val)) {
      strengthBar.classList.add('strength-medium');
    } else {
      strengthBar.classList.add('strength-strong');
    }
  });

  // ── House photo — live filename preview + drag-and-drop feedback ────────────
  function updatePhotoLabel(file) {
    if (!housePhotoChosen) return;
    if (file) {
      housePhotoChosen.textContent = `✓ ${file.name}`;
      housePhotoChosen.hidden = false;
      if (housePhotoLabel) housePhotoLabel.style.borderColor = 'var(--accent)';
    } else {
      housePhotoChosen.textContent = '';
      housePhotoChosen.hidden = true;
      if (housePhotoLabel) housePhotoLabel.style.borderColor = '';
    }
  }

  housePhotoInput?.addEventListener('change', () => {
    updatePhotoLabel(housePhotoInput.files?.[0] || null);
  });

  // Drag-and-drop onto the label
  housePhotoLabel?.addEventListener('dragover', (e) => {
    e.preventDefault();
    housePhotoLabel.classList.add('drag-over');
  });
  housePhotoLabel?.addEventListener('dragleave', () => {
    housePhotoLabel.classList.remove('drag-over');
  });
  housePhotoLabel?.addEventListener('drop', (e) => {
    e.preventDefault();
    housePhotoLabel.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file && housePhotoInput) {
      // Create a DataTransfer to assign the dropped file to the input
      const dt = new DataTransfer();
      dt.items.add(file);
      housePhotoInput.files = dt.files;
      updatePhotoLabel(file);
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showError = (message) => {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
    if (successBox) successBox.hidden = true;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(errorBox, { x: -8, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    }
  };

  const clearError = () => {
    if (errorBox) { errorBox.textContent = ''; errorBox.hidden = true; }
  };

  const showSuccess = (message) => {
    // Only call after a confirmed 200/201 success response from the backend
    if (successBox) {
      successBox.hidden = false;
      if (successMessage) successMessage.textContent = message;
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(successBox, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.5)' });
      }
    }
    if (errorBox) errorBox.hidden = true;
  };

  const setLoading = (isLoading) => {
    if (!registerBtn) return;
    registerBtn.disabled = isLoading;
    registerBtn.innerHTML = isLoading
      ? '<span>Submitting…</span>'
      : '<span>Register &amp; Submit Application</span><i class="fa-solid fa-paper-plane"></i>';
  };

  // ── Form submit ───────────────────────────────────────────────────────────
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    // ── Section 1: Personal Information ─────────────────────────────────────
    const fullName    = String(form.full_name.value    || '').trim();
    const nic         = String(form.nic.value          || '').trim();
    const dob         = String(form.dob.value          || '').trim();
    const gender      = String(form.gender.value       || '').trim();
    const phoneNum    = String(form.phone_num.value    || '').trim();
    const address     = String(form.address.value      || '').trim();

    // ── Section 2: Account Credentials ──────────────────────────────────────
    const username        = String(form.username.value         || '').trim();
    const password        = String(form.password.value         || '');
    const confirmPassword = String(form.confirm_password.value || '');

    // ── Section 3: Application Details ──────────────────────────────────────
    const monthlyIncomeRaw = form.monthly_income.value;
    const monthlyIncome    = monthlyIncomeRaw !== '' ? parseFloat(monthlyIncomeRaw) : null;
    const numDependentsRaw = form.num_dependents.value;
    const numDependents    = numDependentsRaw !== '' ? parseInt(numDependentsRaw, 10) : null;
    const reason           = String(form.reason.value || '').trim();

    // ── Client-side validation ────────────────────────────────────────────────

    // Section 1
    if (!fullName) {
      showError('Please enter your full name as it appears on your NIC.');
      return;
    }
    if (!nic) {
      showError('Please enter your NIC number.');
      return;
    }
    if (!dob) {
      showError('Please select your date of birth.');
      return;
    }
    if (!gender) {
      showError('Please select your gender.');
      return;
    }
    if (!address) {
      showError('Please enter your permanent address.');
      return;
    }
    if (phoneNum && !/^[0-9+]{7,20}$/.test(phoneNum)) {
      showError('Please enter a valid phone number (7–20 digits).');
      return;
    }

    // House photo
    const housePhotoFile = housePhotoInput?.files?.[0] || null;
    if (!housePhotoFile) {
      showError('Please upload a photo of your house (JPEG or PNG).');
      housePhotoLabel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(housePhotoFile.type)) {
      showError('House photo must be a JPEG or PNG image.');
      return;
    }
    if (housePhotoFile.size > 5 * 1024 * 1024) {
      showError('House photo must be smaller than 5 MB.');
      return;
    }

    // Section 2
    if (username.length < 3) {
      showError('Username must be at least 3 characters long.');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match. Please check and try again.');
      if (typeof gsap !== 'undefined') {
        gsap.to('#confirm_password', { x: [-8, 8, -6, 6, 0], duration: 0.4, ease: 'power2.inOut' });
      }
      return;
    }

    // Section 3
    if (monthlyIncome === null || isNaN(monthlyIncome)) {
      showError('Please enter your monthly household income (enter 0 if none).');
      return;
    }
    if (monthlyIncome < 0) {
      showError('Monthly income cannot be a negative value.');
      return;
    }
    if (numDependents === null || isNaN(numDependents)) {
      showError('Please enter the number of dependents (enter 0 if none).');
      return;
    }
    if (numDependents < 0 || numDependents > 20) {
      showError('Number of dependents must be between 0 and 20.');
      return;
    }
    if (!reason || reason.length < 10) {
      showError('Please describe your reason for applying (at least 10 characters).');
      return;
    }

    setLoading(true);

    try {
      // ── Build FormData payload (required for multipart/form-data file upload) ────
      // DO NOT set Content-Type manually — the browser sets it automatically
      // with the correct multipart boundary when using FormData.
      const formData = new FormData();

      // Personal info
      formData.append('Full_Name',  fullName);
      formData.append('NIC',        nic);
      formData.append('DOB',        dob);
      formData.append('Gender',     gender);
      if (phoneNum) formData.append('Phone_Num', phoneNum);
      formData.append('Address',    address);

      // Credentials
      formData.append('Username',   username);
      formData.append('Password',   password);

      // Application details
      formData.append('Monthly_Income', monthlyIncome);
      formData.append('Dependents',     numDependents);
      formData.append('Reason',         reason);

      // House photo file
      formData.append('housePhoto', housePhotoFile);

      // ── POST to /api/auth/register ────────────────────────────────────────────
      // NOTE: No 'Content-Type' header — browser sets multipart/form-data
      //       with the correct boundary automatically when using FormData.
      const response = await fetch('/api/auth/register', {
        method:  'POST',
        body:    formData,
        // headers intentionally omitted — no Content-Type, no JSON
      });

      // Always try to parse JSON first
      let data;
      try {
        data = await response.json();
      } catch (_jsonErr) {
        // Non-JSON body (e.g. unexpected 500 HTML page)
        throw new Error(
          response.ok
            ? 'Unexpected response from the server. Please try again.'
            : 'A server error occurred. Please try again later.'
        );
      }

      // Only show success when the server explicitly returns status: 'success'
      if (!response.ok || data?.status !== 'success') {
        throw new Error(data?.message || 'Registration failed. Please try again.');
      }

      // ── Success path — response was 201 and status === 'success' ──────────
      showSuccess('Registration complete! Your application has been submitted. Redirecting to login…');
      form.reset();
      // Reset strength bar after form clear
      if (strengthBar) {
        strengthBar.className = 'password-strength-bar';
        strengthBar.style.width = '0%';
      }
      // Reset file input visual state
      updatePhotoLabel(null);

      // Redirect after the user can read the success message
      window.setTimeout(() => {
        window.location.href = 'login.html';
      }, 2800);

    } catch (err) {
      // All error paths land here — success box stays hidden
      showError(err.message || 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  });
});
