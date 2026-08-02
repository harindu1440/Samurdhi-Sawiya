'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Enforce session and get user info
  const session = getSession('Samurdhi_Officer');
  if (session) {
    document.getElementById('officer-name').textContent = session.Username || 'Officer';
  }

  const tbody = document.getElementById('applications-tbody');
  const modal = document.getElementById('reviewModal');
  const homeVisitForm = document.getElementById('home-visit-form');
  const searchInput = document.getElementById('searchInput');

  let currentApplications = [];
  let approvedApplications = [];
  let myApplicants = [];
  let currentTab = 'pending';

  // Initialize Register Applicant iframe URL
  if (session && session.id) {
    const registerIframe = document.getElementById('register-iframe');
    if (registerIframe) {
      registerIframe.src = `register.html?mode=officer&officer_id=${session.id}`;
    }
  }

  // Tab switching logic
  window.switchTab = (tab) => {
    currentTab = tab;
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active', 'border-blue-600', 'text-blue-600', 'dark:border-blue-500', 'dark:text-blue-500');
      btn.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400', 'hover:text-slate-600', 'hover:border-slate-300', 'dark:hover:text-slate-300');
    });
    
    const activeBtn = document.getElementById(`${tab}-tab`);
    if (activeBtn) {
      activeBtn.classList.add('active', 'border-blue-600', 'text-blue-600', 'dark:border-blue-500', 'dark:text-blue-500');
      activeBtn.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400', 'hover:text-slate-600', 'hover:border-slate-300', 'dark:hover:text-slate-300');
    }

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.add('hidden');
      panel.classList.remove('active');
    });
    const activePanel = document.getElementById(`${tab}-panel`);
    if (activePanel) {
      activePanel.classList.remove('hidden');
      activePanel.classList.add('active');
    }

    if (searchInput) searchInput.value = '';
    
    if (tab === 'pending') {
      renderTable(currentApplications);
    } else if (tab === 'approved') {
      loadApprovedApplications();
    } else if (tab === 'my-applicants') {
      loadMyApplicants();
    }
  };

  // 1. Fetch pending applications
  async function loadDashboard() {
    try {
      const res = await authFetch('/api/officer/dashboard');
      if (res && res.status === 'success') {
        if (res.profile) {
          const officerName = document.getElementById('officer-name');
          if (officerName) {
            const divText = res.profile.GN_Division ? `${res.profile.GN_Division} | ${res.profile.Division}` : res.profile.Division;
            officerName.innerHTML = `${res.profile.Name}<br><small style="font-weight:400; color:rgba(255,255,255,0.7); font-size: 0.8em;">${divText}</small>`;
          }
        }
        currentApplications = res.pending_applications || [];
        if (currentTab === 'pending') renderTable(currentApplications);
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="text-red-500 p-4">Failed to load applications from server.</td></tr>';
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      tbody.innerHTML = '<tr><td colspan="6" class="text-red-500 p-4">Failed to load applications. Network error.</td></tr>';
    }
  }

  // Load approved applications
  async function loadApprovedApplications() {
    const approvedTbody = document.getElementById('approved-tbody');
    approvedTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Loading approved applications...</td></tr>';
    try {
      const res = await authFetch('/api/officer/approved');
      if (res && res.status === 'success') {
        approvedApplications = res.data || [];
        renderApprovedTable(approvedApplications);
      } else {
        approvedTbody.innerHTML = '<tr><td colspan="6" class="text-red-500 p-4">Failed to load approved applications.</td></tr>';
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      approvedTbody.innerHTML = '<tr><td colspan="6" class="text-red-500 p-4">Network error.</td></tr>';
    }
  }

  // Load My Applicants
  async function loadMyApplicants() {
    const myTbody = document.getElementById('my-applicants-tbody');
    if (!myTbody) return;
    
    myTbody.innerHTML = '<tr><td colspan="6" class="empty-state">Loading your applicants...</td></tr>';
    try {
      const res = await authFetch('/api/officer/my-applicants');
      if (res && res.status === 'success') {
        myApplicants = res.data || [];
        renderMyApplicantsTable(myApplicants);
      } else {
        myTbody.innerHTML = '<tr><td colspan="6" class="text-red-500 p-4">Failed to load your applicants.</td></tr>';
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      myTbody.innerHTML = '<tr><td colspan="6" class="text-red-500 p-4">Network error.</td></tr>';
    }
  }

  // 2. Render table
  function renderTable(apps) {
    if (apps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No pending applications to review.</td></tr>';
      return;
    }

    tbody.innerHTML = apps.map(app => {
      const isPending = app.Status === 'Pending';
      const isRejected = app.Status === 'Rejected';
      
      let statusBadge = '';
      if (isPending) {
        statusBadge = '<span class="bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-500/30">Pending Review</span>';
      } else if (isRejected) {
        statusBadge = '<span class="bg-red-500/20 text-red-700 dark:text-red-500 px-3 py-1 rounded-full text-xs font-semibold border border-red-500/30">Rejected</span>';
      } else {
        // Any approved status (Officer, GN, Minister)
        const displayStatus = app.Status.replace('_', ' ');
        statusBadge = `<span class="bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30">${displayStatus}</span>`;
      }

      const actionBtn = isPending
        ? `<button onclick="openReviewModal('${app.Application_ID}')" class="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-4 py-2 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]">Review</button>`
        : '<span class="text-slate-400 text-sm font-medium italic">Reviewed</span>';

      return `
        <tr class="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-700/50">
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">#${app.Application_ID}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-semibold">${app.applicant_name}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${app.Date_Submitted ? app.Date_Submitted.substring(0, 10) : 'N/A'}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">LKR ${Number(app.Monthly_Income).toLocaleString()}</td>
          <td class="px-6 py-4">${statusBadge}</td>
          <td class="px-6 py-4">
            ${actionBtn}
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderApprovedTable(apps) {
    const approvedTbody = document.getElementById('approved-tbody');
    if (apps.length === 0) {
      approvedTbody.innerHTML = '<tr><td colspan="6" class="empty-state">No approved applications found.</td></tr>';
      return;
    }

    approvedTbody.innerHTML = apps.map(app => {
      const displayStatus = app.Status.replace('_', ' ');
      const statusBadge = `<span class="bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30">${displayStatus}</span>`;

      return `
        <tr class="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-700/50">
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">#${app.Application_ID}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-semibold">${app.applicant_name}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${app.Date_Submitted ? app.Date_Submitted.substring(0, 10) : 'N/A'}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${app.Approval_Date ? app.Approval_Date.substring(0, 10) : 'N/A'}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">LKR ${Number(app.Monthly_Income).toLocaleString()}</td>
          <td class="px-6 py-4">${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  function renderMyApplicantsTable(apps) {
    const myTbody = document.getElementById('my-applicants-tbody');
    if (!myTbody) return;

    if (apps.length === 0) {
      myTbody.innerHTML = '<tr><td colspan="6" class="empty-state">You have not registered any applicants yet.</td></tr>';
      return;
    }

    myTbody.innerHTML = apps.map(app => {
      // Determine status badge
      let statusBadge = '';
      if (!app.Status) {
        statusBadge = '<span class="text-slate-400">Account only (No App)</span>';
      } else if (app.Status === 'Pending') {
        statusBadge = '<span class="bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-500/30">Pending Review</span>';
      } else if (app.Status === 'Rejected') {
        statusBadge = '<span class="bg-red-500/20 text-red-700 dark:text-red-500 px-3 py-1 rounded-full text-xs font-semibold border border-red-500/30">Rejected</span>';
      } else {
        const displayStatus = app.Status.replace('_', ' ');
        statusBadge = `<span class="bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30">${displayStatus}</span>`;
      }

      return `
        <tr class="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-700/50">
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">#${app.Applicant_ID}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-semibold">${app.Full_Name}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${app.NIC || 'N/A'}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${app.Phone_Num || 'N/A'}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${app.Date_Submitted ? app.Date_Submitted.substring(0, 10) : 'N/A'}</td>
          <td class="px-6 py-4">${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  // Search Filter Logic
  window.handleSearch = () => {
    if (!searchInput) return;
    const term = searchInput.value.toLowerCase();
    
    const match = (obj, key) => String(obj[key] || '').toLowerCase().includes(term);

    if (currentTab === 'pending') {
      const filtered = currentApplications.filter(app => 
        match(app, 'Application_ID') ||
        match(app, 'applicant_name') ||
        match(app, 'NIC')
      );
      renderTable(filtered);
    } else if (currentTab === 'approved') {
      const filtered = approvedApplications.filter(app => 
        match(app, 'Application_ID') ||
        match(app, 'applicant_name') ||
        match(app, 'NIC')
      );
      renderApprovedTable(filtered);
    } else if (currentTab === 'my-applicants') {
      const filtered = myApplicants.filter(app => 
        match(app, 'Applicant_ID') ||
        match(app, 'Full_Name') ||
        match(app, 'NIC') ||
        match(app, 'Phone_Num')
      );
      renderMyApplicantsTable(filtered);
    }
  };

  // 3. Open Modal
  window.openReviewModal = (id) => {
    // The details are already fetched and cached from the dashboard API
    const app = currentApplications.find(a => String(a.Application_ID) === String(id));
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

    const photoContainer = document.querySelector('.photo-container');
    const noImgEl = document.getElementById('detail-no-photo');
    
    // Clear previously injected images
    const existingImgs = photoContainer.querySelectorAll('img.dynamic-house-photo');
    existingImgs.forEach(img => img.remove());
    
    // Original static img might still be there, hide it if present
    const staticImg = document.getElementById('detail-house-photo');
    if (staticImg) staticImg.style.display = 'none';

    if (app.House_Photo) {
      noImgEl.classList.add('hidden');
      const photos = app.House_Photo.split(',');
      photos.forEach(photo => {
        const img = document.createElement('img');
        img.className = 'dynamic-house-photo max-h-[400px] object-contain m-2 border border-slate-300 dark:border-slate-700 rounded-lg';
        img.src = `/uploads/houses/${photo.trim()}`;
        img.alt = 'House Photo';
        img.onerror = function() { this.style.display='none'; };
        photoContainer.appendChild(img);
      });
      // Enable flex-wrap on container for multiple images
      photoContainer.style.flexWrap = 'wrap';
    } else {
      noImgEl.classList.remove('hidden');
    }

    // Reset form
    homeVisitForm.reset();
    homeVisitPhotoDT = new DataTransfer();
    const photoListEl = document.getElementById('home-visit-photo-list');
    if (photoListEl) {
      photoListEl.innerHTML = '';
      photoListEl.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(modal.children[0], 
        { y: 50, opacity: 0, scale: 0.95 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  };

  // Close Modal
  window.closeReviewModal = () => {
    modal.classList.add('hidden');
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeReviewModal();
    }
  });

  // 4. Handle Form Submission
  let homeVisitPhotoDT = new DataTransfer();
  const homeVisitPhotoInput = document.getElementById('home-visit-photo');

  function renderHomeVisitPhotoList() {
    const listEl = document.getElementById('home-visit-photo-list');
    if (!listEl || !homeVisitPhotoInput) return;
    
    const files = homeVisitPhotoDT.files;
    homeVisitPhotoInput.files = files; // Sync with input
    
    if (files && files.length > 0) {
      let html = '';
      for (let i = 0; i < files.length; i++) {
        html += `
          <li style="padding: 4px 8px; margin-bottom: 4px; background: rgba(0,0,0,0.05); border-radius: 4px; display: flex; justify-content: space-between; align-items: center; list-style-type: none;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">✓ ${files[i].name}</span>
            <button type="button" class="remove-visit-photo-btn" data-index="${i}" style="color: red; border: none; background: none; cursor: pointer; font-weight: bold; margin-left: 8px;">✕</button>
          </li>`;
      }
      listEl.innerHTML = html;
      listEl.classList.remove('hidden');
      
      const removeBtns = listEl.querySelectorAll('.remove-visit-photo-btn');
      removeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const indexToRemove = parseInt(e.target.getAttribute('data-index'), 10);
          const newDt = new DataTransfer();
          for(let i=0; i<homeVisitPhotoDT.files.length; i++) {
            if(i !== indexToRemove) newDt.items.add(homeVisitPhotoDT.files[i]);
          }
          homeVisitPhotoDT = newDt;
          renderHomeVisitPhotoList();
        });
      });
    } else {
      listEl.innerHTML = '';
      listEl.classList.add('hidden');
    }
  }

  if (homeVisitPhotoInput) {
    homeVisitPhotoInput.addEventListener('change', (e) => {
      homeVisitPhotoDT = new DataTransfer();
      for (let i = 0; i < e.target.files.length; i++) {
        homeVisitPhotoDT.items.add(e.target.files[i]);
      }
      renderHomeVisitPhotoList();
    });
  }

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
