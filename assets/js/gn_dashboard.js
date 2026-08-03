'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // ── Elements ─────────────────────────────────────────────────────────────
  const tbody        = document.getElementById('applications-tbody');
  const searchInput  = document.getElementById('searchInput');
  const modal        = document.getElementById('reviewModal');
  const form         = document.getElementById('gn-review-form');
  
  // Dashboard Metrics
  const statTotal    = document.getElementById('stat-total');
  const statPending  = document.getElementById('stat-pending');
  const statApproved = document.getElementById('stat-approved');
  const gnName       = document.getElementById('gn-name');

  // Modal Details
  const dName        = document.getElementById('d-name');
  const dNic         = document.getElementById('d-nic');
  const dPhone       = document.getElementById('d-phone');
  const dAddress     = document.getElementById('d-address');
  const dAppid       = document.getElementById('d-appid');
  const dIncome      = document.getElementById('d-income');
  const dDependents  = document.getElementById('d-dependents');
  const dReason      = document.getElementById('d-reason');
  const dHousePhoto  = document.getElementById('d-house-photo');
  const dNoHousePhoto= document.getElementById('d-no-house-photo');
  
  const dOffRemarks  = document.getElementById('d-officer-remarks');
  const dOffRec      = document.getElementById('d-officer-recommendation');
  const dVisitPhoto  = document.getElementById('d-visit-photo');
  const dNoVisitPhoto= document.getElementById('d-no-visit-photo');

  // Buttons inside Modal
  const btnApprove   = document.getElementById('btn-approve');
  const btnReject    = document.getElementById('btn-reject');
  const btnReturn    = document.getElementById('btn-return');

  let currentApps = [];
  let approvedApps = [];
  let rejectedApps = [];
  let currentTab = 'pending';
  let selectedAppId = null;

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
      renderTable(currentApps);
    } else if (tab === 'approved') {
      loadApprovedApplications('approved');
    } else if (tab === 'rejected') {
      loadApprovedApplications('rejected');
    }
  };

  // ── Validation & Auth ──────────────────────────────────────────────────
  const session = getSession('Grama_Niladhari');
  if (!session) return;
  
  if (gnName) {
    gnName.textContent = session.name || 'Grama Niladhari';
  }

  // ── 1. Fetch & Render Dashboard Data ─────────────────────────────────────
  async function loadDashboard() {
    try {
      const data = await authFetch('/api/gn/dashboard');
      if (!data || data.status !== 'success') throw new Error();

      if (gnName && data.profile) {
        gnName.innerHTML = `${data.profile.Name}<br><small style="font-weight:400; color:rgba(255,255,255,0.7); font-size: 0.8em;">${data.profile.GN_Division} | ${data.profile.Division}</small>`;
      }

      // Update Metrics
      if (statTotal)    statTotal.textContent    = data.stats.total_applications;
      if (statPending)  statPending.textContent  = data.stats.pending_gn;
      if (statApproved) statApproved.textContent = data.stats.forwarded;

      currentApps = data.applications || [];
      if (currentTab === 'pending') renderTable(currentApps);

      if (typeof gsap !== 'undefined') {
        gsap.from('.metric-card', { duration: 0.8, y: 30, opacity: 0, stagger: 0.1, ease: 'power3.out' });
        gsap.from('.panel', { duration: 0.8, y: 30, opacity: 0, delay: 0.2, ease: 'power3.out' });
      }
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red-500 py-10">Failed to load data. Please refresh.</td></tr>';
    }
  }

  // Load approved applications
  async function loadApprovedApplications(targetTab = 'approved') {
    const tableId = targetTab === 'approved' ? 'approved-tbody' : 'rejected-tbody';
    const tbodyEl = document.getElementById(tableId);
    if (tbodyEl) tbodyEl.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-slate-500">Loading ${targetTab} applications...</td></tr>`;
    try {
      const res = await authFetch('/api/gn/approved');
      if (res && res.status === 'success') {
        const allProcessed = res.data || [];
        approvedApps = allProcessed.filter(app => app.Status !== 'Rejected');
        rejectedApps = allProcessed.filter(app => app.Status === 'Rejected');
        
        if (targetTab === 'approved') {
          renderApprovedTable(approvedApps, 'approved-tbody', 'No approved applications found.');
        } else {
          renderApprovedTable(rejectedApps, 'rejected-tbody', 'No rejected applications found.');
        }
      } else {
        if (tbodyEl) tbodyEl.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-10">Failed to load ${targetTab} applications.</td></tr>`;
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      if (tbodyEl) tbodyEl.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-10">Network error.</td></tr>`;
    }
  }


  // ── 2. Render Table ──────────────────────────────────────────────────────
  function renderTable(apps) {
    if (apps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-slate-500">No applications match your criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = apps.map(app => {
      // The GN dashboard explicitly pulls Officer_Approved items to review.
      const statusBadge = '<span class="bg-blue-500/20 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-semibold border border-blue-500/30">Officer Approved</span>';

      return `
        <tr class="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-700/50">
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">#${app.Application_ID}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-semibold">${app.applicant_name}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${app.Date_Submitted ? app.Date_Submitted.substring(0, 10) : 'N/A'}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">LKR ${Number(app.Monthly_Income).toLocaleString()}</td>
          <td class="px-6 py-4">${statusBadge}</td>
          <td class="px-6 py-4">
            <button onclick="openReviewModal('${app.Application_ID}')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 py-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]">
              Review
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderApprovedTable(apps, tbodyId = 'approved-tbody', emptyMsg = 'No applications found.') {
    const approvedTbody = document.getElementById(tbodyId);
    if (!approvedTbody) return;
    if (apps.length === 0) {
      approvedTbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-slate-500">${emptyMsg}</td></tr>`;
      return;
    }

    approvedTbody.innerHTML = apps.map(app => {
      const displayStatus = app.Status.replace('_', ' ');
      let statusBadge;
      if (app.Status === 'Rejected') {
        statusBadge = `<span class="bg-red-500/20 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-xs font-semibold border border-red-500/30">${displayStatus}</span>`;
      } else {
        statusBadge = `<span class="bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30">${displayStatus}</span>`;
      }

      return `
        <tr class="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-700/50">
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">#${app.Application_ID}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-semibold">${app.applicant_name}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${app.Date_Submitted ? app.Date_Submitted.substring(0, 10) : 'N/A'}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">LKR ${Number(app.Monthly_Income).toLocaleString()}</td>
          <td class="px-6 py-4">${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }

  // ── Search & Filter ──────────────────────────────────────────────────────
  window.handleSearch = () => {
    if (!searchInput) return;
    const term = searchInput.value.toLowerCase();
    
    let targetApps = [];
    if (currentTab === 'pending') targetApps = currentApps;
    else if (currentTab === 'approved') targetApps = approvedApps;
    else if (currentTab === 'rejected') targetApps = rejectedApps;
    
    const filtered = targetApps.filter(app => 
      String(app.Application_ID).toLowerCase().includes(term) ||
      String(app.applicant_name).toLowerCase().includes(term) ||
      String(app.NIC).toLowerCase().includes(term)
    );

    if (currentTab === 'pending') renderTable(filtered);
    else if (currentTab === 'approved') renderApprovedTable(filtered, 'approved-tbody', 'No approved applications match your search.');
    else if (currentTab === 'rejected') renderApprovedTable(filtered, 'rejected-tbody', 'No rejected applications match your search.');
  };
  // ── 4. Open Modal ────────────────────────────────────────────────────────
  window.openReviewModal = (id) => {
    const app = currentApps.find(a => String(a.Application_ID) === String(id));
    if (!app) return;

    selectedAppId = app.Application_ID;
    document.getElementById('gn-app-id').value = selectedAppId;
    document.getElementById('gn-remarks').value = '';

    // Populate Applicant Info
    dName.textContent       = app.applicant_name || 'N/A';
    dNic.textContent        = app.NIC || 'N/A';
    dPhone.textContent      = app.Phone_Num || 'N/A';
    dAddress.textContent    = app.Address || 'N/A';
    dAppid.textContent      = app.Application_ID;
    dIncome.textContent     = Number(app.Monthly_Income).toLocaleString();
    dDependents.textContent = app.Dependents || '0';
    dReason.textContent     = app.Reason || 'N/A';

    // Officer Info
    let rawRemarks = app.officer_remarks || 'No remarks provided.';
    let visitPhotoExtracted = null;

    // The officer dashboard appends the photo filename to the remarks because the DB column couldn't be added
    const photoMatch = rawRemarks.match(/\|\s*\[Attached Photo:\s*([^\]]+)\]/);
    if (photoMatch) {
      visitPhotoExtracted = photoMatch[1];
      rawRemarks = rawRemarks.replace(photoMatch[0], '').trim();
    }

    dOffRemarks.textContent = rawRemarks;
    dOffRec.textContent = app.officer_recommendation || 'No Recommendation';

    // Photos
    if (app.House_Photo) {
      dHousePhoto.src = `/uploads/houses/${app.House_Photo}`;
      dHousePhoto.classList.remove('hidden');
      dHousePhoto.style.display = 'block'; // Reset display in case it was hidden by onerror
      dNoHousePhoto.classList.add('hidden');
    } else {
      dHousePhoto.classList.add('hidden');
      dNoHousePhoto.classList.remove('hidden');
    }

    if (visitPhotoExtracted || app.Home_Visit_Photo) {
      const finalVisitPhoto = visitPhotoExtracted || app.Home_Visit_Photo;
      dVisitPhoto.src = `/uploads/home_visits/${finalVisitPhoto}`;
      dVisitPhoto.classList.remove('hidden');
      dVisitPhoto.style.display = 'block'; // Reset display in case it was hidden by onerror
      dNoVisitPhoto.classList.add('hidden');
    } else {
      dVisitPhoto.classList.add('hidden');
      dNoVisitPhoto.classList.remove('hidden');
    }

    // Show modal
    modal.classList.remove('hidden');
  };

  window.closeReviewModal = () => {
    modal.classList.add('hidden');
    selectedAppId = null;
  };

  // ── 5. Action Submission ─────────────────────────────────────────────────
  const processAction = async (actionStr, btnNode) => {
    if (!selectedAppId) return;

    const remarks = document.getElementById('gn-remarks').value.trim();
    if ((actionStr === 'return' || actionStr === 'reject') && !remarks) {
      alert('Please enter your GN Remarks/Reason before returning or rejecting.');
      return;
    }

    const originalContent = btnNode.innerHTML;
    btnNode.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btnApprove.disabled = btnReject.disabled = btnReturn.disabled = true;

    try {
      const res = await authFetch('/api/gn/action', {
        method: 'POST',
        body: JSON.stringify({
          application_id: selectedAppId,
          action: actionStr,
          gn_remarks: remarks
        })
      });

      if (res && res.status === 'success') {
        alert(res.message);
        closeReviewModal();
        loadDashboard(); // Refresh table and stats
      } else {
        alert(res?.message || 'An error occurred.');
      }
    } catch (err) {
      alert('Network error submitting decision.');
    } finally {
      btnNode.innerHTML = originalContent;
      btnApprove.disabled = btnReject.disabled = btnReturn.disabled = false;
    }
  };

  if (btnApprove) btnApprove.addEventListener('click', () => processAction('approve', btnApprove));
  if (btnReject)  btnReject.addEventListener('click',  () => processAction('reject', btnReject));
  if (btnReturn)  btnReturn.addEventListener('click',  () => processAction('return', btnReturn));

  // Init
  loadDashboard();
});
