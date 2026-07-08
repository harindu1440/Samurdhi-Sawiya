'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Enforce session and get user info
  const session = getSession('Samurdhi_Officer');
  if (session) {
    document.getElementById('officer-name').textContent = session.Username || 'Officer';
  }

  const tbody = document.getElementById('applications-tbody');
  const modal = document.getElementById('application-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const homeVisitForm = document.getElementById('home-visit-form');

  let currentApplications = [];

  // 1. Fetch pending applications
  async function loadDashboard() {
    try {
      const res = await authFetch('/api/officer/dashboard');
      if (res && res.status === 'success') {
        currentApplications = res.pending_applications || [];
        renderTable(currentApplications);
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="text-red-500 p-4">Failed to load applications from server.</td></tr>';
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      tbody.innerHTML = '<tr><td colspan="6" class="text-red-500 p-4">Failed to load applications. Network error.</td></tr>';
    }
  }

  // 2. Render table
  function renderTable(apps) {
    if (apps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No pending applications to review.</td></tr>';
      return;
    }

    tbody.innerHTML = apps.map(app => `
      <tr class="cursor-pointer hover:bg-white/5 transition-colors" onclick="openModal(${app.Application_ID})">
        <td>#${app.Application_ID}</td>
        <td class="font-semibold">${app.applicant_name}</td>
        <td>${app.Date_Submitted ? app.Date_Submitted.substring(0, 10) : 'N/A'}</td>
        <td>LKR ${Number(app.Monthly_Income).toLocaleString()}</td>
        <td><span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-500">Pending Review</span></td>
        <td>
          <button class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">
            Review
          </button>
        </td>
      </tr>
    `).join('');
  }

  // 3. Open Modal
  window.openModal = (id) => {
    const app = currentApplications.find(a => a.Application_ID === id);
    if (!app) return;

    document.getElementById('visit-app-id').value = app.Application_ID;
    document.getElementById('detail-appid').textContent = app.Application_ID;
    document.getElementById('detail-name').textContent = app.applicant_name;
    document.getElementById('detail-nic').textContent = app.NIC;
    document.getElementById('detail-phone').textContent = app.Phone_Num || 'N/A';
    document.getElementById('detail-address').textContent = app.Address;
    document.getElementById('detail-income').textContent = Number(app.Monthly_Income).toLocaleString();
    document.getElementById('detail-dependents').textContent = app.Dependents;
    document.getElementById('detail-reason').textContent = app.Reason;

    const imgEl = document.getElementById('detail-house-photo');
    const noImgEl = document.getElementById('detail-no-photo');
    
    if (app.House_Photo) {
      imgEl.src = `/uploads/houses/${app.House_Photo}`;
      imgEl.style.display = 'block';
      noImgEl.classList.add('hidden');
    } else {
      imgEl.style.display = 'none';
      noImgEl.classList.remove('hidden');
    }

    // Reset form
    homeVisitForm.reset();

    modal.classList.remove('hidden');
    if (typeof gsap !== 'undefined') {
      gsap.fromTo('.modal-card', 
        { y: 50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  };

  // Close Modal
  closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // 4. Handle Form Submission
  let selectedAction = '';
  const actionButtons = homeVisitForm.querySelectorAll('button[type="submit"]');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      selectedAction = e.currentTarget.getAttribute('data-action');
    });
  });

  homeVisitForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const notes = document.getElementById('officer-notes').value.trim();
    if (!notes) {
      alert('Please enter your officer notes/remarks.');
      return;
    }
    if (!selectedAction) return;

    const formData = new FormData(homeVisitForm);
    formData.append('StatusAction', selectedAction);

    const submitBtn = homeVisitForm.querySelector(`button[data-action="${selectedAction}"]`);
    const origText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
      // Use native fetch to bypass JSON stringification for FormData
      const token = localStorage.getItem('token');
      const response = await fetch('/api/officer/visit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData // DO NOT set Content-Type, browser boundary needs it
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        alert(data.message);
        modal.classList.add('hidden');
        loadDashboard(); // Refresh table
      } else {
        alert(data.message || 'An error occurred.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting review.');
    } finally {
      submitBtn.innerHTML = origText;
      submitBtn.disabled = false;
    }
  });

  loadDashboard();
});
