// ─────────────────────────────────────────────────────────────────────────────
// register.js — Applicant Self-Registration
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
  const confirmInput    = document.getElementById('confirm_password');
  const strengthBar     = document.getElementById('strength-bar');

  if (!form) return;

  // ── GSAP entrance animations ────────────────────────────────────────────────
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

  // ── Live password strength indicator ────────────────────────────────────────
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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showError = (message) => {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
    if (successBox) successBox.hidden = true;
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(errorBox, { x: -8, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    }
  };

  const clearError = () => {
    if (errorBox) { errorBox.textContent = ''; errorBox.hidden = true; }
  };

  const showSuccess = (message) => {
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
      ? '<span>Creating account…</span>'
      : '<span>Create Account</span><i class="fa-solid fa-arrow-right"></i>';
  };

  // ── Form submit ──────────────────────────────────────────────────────────────
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const username        = String(form.username.value        || '').trim();
    const phone_num       = String(form.phone_num.value       || '').trim();
    const password        = String(form.password.value        || '');
    const confirmPassword = String(form.confirm_password.value || '');

    // ── Client-side validation ─────────────────────────────────────────────────
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
      // Shake the confirm field to highlight the mismatch
      if (typeof gsap !== 'undefined') {
        gsap.to('#confirm_password', { x: [-8, 8, -6, 6, 0], duration: 0.4, ease: 'power2.inOut' });
      }
      return;
    }

    if (phone_num && !/^[0-9+]{7,20}$/.test(phone_num)) {
      showError('Please enter a valid phone number (7–20 digits).');
      return;
    }

    setLoading(true);

    try {
      // ── POST to /api/auth/register ───────────────────────────────────────────
      const response = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ Username: username, Phone_Num: phone_num, Password: password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        // If the server didn't return valid JSON (e.g. 500 error page)
        if (!response.ok) {
          throw new Error('A server error occurred. Please try again later.');
        } else {
          throw new Error('Unexpected response format from the server.');
        }
      }

      if (!response.ok || data?.status !== 'success') {
        throw new Error(data?.message || 'Registration failed. Please try again.');
      }

      // ── Success ──────────────────────────────────────────────────────────────
      showSuccess('Account created! Redirecting to login…');
      form.reset();
      if (strengthBar) { strengthBar.className = 'password-strength-bar'; strengthBar.style.width = '0%'; }

      // Redirect after a brief moment so the user sees the success message
      window.setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);

    } catch (err) {
      showError(err.message || 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  });
});
