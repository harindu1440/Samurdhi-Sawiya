// ─────────────────────────────────────────────────────────────────────────────
// theme.js — System-wide Theme Manager
// Light mode has been permanently removed per user request.
// This script now solely ensures the dark theme is strictly enforced.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // Force dark theme on html tag immediately to prevent FOUC
  document.documentElement.setAttribute('data-theme', 'dark');
  document.documentElement.classList.add('dark-theme'); // for index.html backwards compatibility

  // Clean up any old localStorage theme settings
  if (localStorage.getItem('theme')) {
    localStorage.removeItem('theme');
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Ensure it remains dark in case any other scripts tried to change it
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark-theme');
    
    // Remove the theme toggle button if it exists in the HTML
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.remove();
    }
  });
})();
