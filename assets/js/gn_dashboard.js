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
  let selectedAppId = null;

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

      // Update Metrics
      if (statTotal)    statTotal.textContent    = data.stats.total_applications;
      if (statPending)  statPending.textContent  = data.stats.pending_gn;
      if (statApproved) statApproved.textContent = data.stats.forwarded;

      currentApps = data.applications || [];
      renderTable(currentApps);

      if (typeof gsap !== 'undefined') {
        gsap.from('.metric-card', { duration: 0.8, y: 30, opacity: 0, stagger: 0.1, ease: 'power3.out' });
        gsap.from('.panel', { duration: 0.8, y: 30, opacity: 0, delay: 0.2, ease: 'power3.out' });
      }
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-red-500 py-10">Failed to load data. Please refresh.</td></tr>';
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

  // ── 3. Search Filter ─────────────────────────────────────────────────────
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = currentApps.filter(app => 
        String(app.Application_ID).toLowerCase().includes(term) ||
        String(app.applicant_name).toLowerCase().includes(term) ||
        String(app.NIC).toLowerCase().includes(term)
      );
      renderTable(filtered);
    });
  }

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

    // Photos
    if (app.House_Photo) {
      dHousePhoto.src = `/uploads/houses/${app.House_Photo}`;
      dHousePhoto.classList.remove('hidden');
      dNoHousePhoto.classList.add('hidden');
    } else {
      dHousePhoto.classList.add('hidden');
      dNoHousePhoto.classList.remove('hidden');
    }

    if (app.Home_Visit_Photo) {
      dVisitPhoto.src = `/uploads/home_visits/${app.Home_Visit_Photo}`;
      dVisitPhoto.classList.remove('hidden');
      dNoVisitPhoto.classList.add('hidden');
    } else {
      dVisitPhoto.classList.add('hidden');
      dNoVisitPhoto.classList.remove('hidden');
    }

    // Officer Info
    dOffRemarks.textContent = app.officer_remarks || 'No remarks provided.';
    dOffRec.textContent = app.officer_recommendation || 'No Recommendation';

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
