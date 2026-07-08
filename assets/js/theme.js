// ─────────────────────────────────────────────────────────────────────────────
// theme.js — System-wide Dark/Light Mode Manager
// Runs early to avoid FOUC (Flash of Unstyled Content).
// ─────────────────────────────────────────────────────────────────────────────

(function() {
  const getStoredTheme = () => localStorage.getItem('theme');
  const setStoredTheme = theme => localStorage.setItem('theme', theme);
  const getPreferredTheme = () => {
    const storedTheme = getStoredTheme();
    if (storedTheme) return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const setTheme = theme => {
    if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  };

  setTheme(getPreferredTheme());

  const showActiveTheme = (theme) => {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;
    
    // Switch icon based on current theme
    if (theme === 'dark') {
      toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
      toggleBtn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
      toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
    }
  };

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const storedTheme = getStoredTheme();
    if (storedTheme !== 'light' && storedTheme !== 'dark') {
      setTheme(getPreferredTheme());
      showActiveTheme(getPreferredTheme());
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    // Inject floating toggle button if none exists on the page
    let toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'theme-toggle-btn';
      toggleBtn.className = 'theme-toggle theme-toggle-floating';
      toggleBtn.setAttribute('aria-label', 'Toggle Theme');
      document.body.appendChild(toggleBtn);
      
      // Inject CSS for the floating button dynamically
      const style = document.createElement('style');
      style.textContent = `
        .theme-toggle-floating {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `;
      document.head.appendChild(style);
    }

    showActiveTheme(getPreferredTheme());

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        setStoredTheme(newTheme);
        setTheme(newTheme);
        showActiveTheme(newTheme);
      });
    }
  });
})();
