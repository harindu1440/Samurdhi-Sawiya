// ─────────────────────────────────────────────────────────────────────────────
// auth.js — Login page logic
// Sends credentials to /api/auth/login, stores JWT in localStorage, redirects.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const form     = document.getElementById('login-form');
  const errorBox = document.getElementById('error-box');

  if (!form) {
    return;
  }

  const showError = (message) => {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  const clearError = () => {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.hidden = true;
  };

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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const formData = new FormData(form);
    const userId   = String(formData.get('user_id')  || '').trim();
    const password = String(formData.get('password') || '').trim();
    const role     = String(formData.get('role')     || '').trim();

    if (!userId || !password || !role) {
      showError('Please complete all login fields before continuing.');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    const submitButton = form.querySelector('.submit-button');
    const originalButtonHTML = submitButton ? submitButton.innerHTML : '';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span>Signing in...</span>';
    }

    try {
      const response = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ User_ID: userId, Password: password, Role: role }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Invalid credentials.');
      }

      // ── Store JWT and user info in localStorage ────────────────────────────
      localStorage.setItem('ss_token', data.token);
      localStorage.setItem('ss_role',  data.role);
      localStorage.setItem('ss_name',  data.name);

      // ── Redirect to role-specific dashboard ───────────────────────────────
      window.location.href = data.redirect || 'index.html';

    } catch (err) {
      showError(err.message || 'Login failed. Please try again.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHTML || '<span>Login</span><i class="fa-solid fa-arrow-right"></i>';
      }
    }
  });
});
