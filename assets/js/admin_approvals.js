// admin_approvals.js - Minister Approval Queue logic
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const adminNameNode = document.getElementById('admin-name');
  const tbody = document.getElementById('approvals-tbody');
  const modal = document.getElementById('approval-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const approveBtn = document.getElementById('approve-btn');
  const rejectBtn = document.getElementById('reject-btn');
  const detailsContainer = document.getElementById('approval-details-container');

  let currentRequestId = null;

  try {
    const session = getSession('Minister');
    if (adminNameNode) adminNameNode.textContent = session.name || 'Minister';

    await loadApprovals();

  } catch (err) {
    console.error('Session error:', err);
    window.location.href = 'login.html';
  }

  // Load approvals from backend
  async function loadApprovals() {
    try {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-state">Loading approvals...</td></tr>';
      const data = await authFetch('/api/minister/approvals');
      
      if (!data || !data.data || data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No applications pending approval.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.data.forEach(app => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-700/50';
        tr.innerHTML = `
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">#REQ-${app.Request_ID}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-bold">${app.Full_Name}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${app.NIC}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${new Date().toLocaleDateString()}</td>
          <td class="px-6 py-4">
            <button class="view-btn bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-all shadow-[0_0_10px_rgba(79,70,229,0.4)]" data-app='${JSON.stringify(app)}'>
              Review
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const app = JSON.parse(e.target.getAttribute('data-app'));
          openModal(app);
        });
      });

    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="5" class="error-state">Failed to load queue.</td></tr>';
    }
  }

  function openModal(app) {
    currentRequestId = app.Request_ID;
    
    // Construct HTML for the details view
    let photoHtml = '<div class="text-slate-500 dark:text-slate-400 p-8 text-center text-sm">No house photo uploaded.</div>';
    if (app.House_Photo) {
      photoHtml = `<img src="/uploads/houses/${app.House_Photo}" class="max-h-[300px] object-contain mx-auto" alt="House Photo" onerror="this.style.display='none'" />`;
    }

    // Extract home visit photo from remarks if present
    let rawRemarks = app.Officer_Remarks || 'None';
    let visitPhotoHtml = '<div class="text-slate-500 dark:text-slate-400 p-6 text-center text-sm">No visit photo uploaded.</div>';
    
    const photoMatch = rawRemarks.match(/\|\s*\[Attached Photo:\s*([^\]]+)\]/);
    if (photoMatch) {
      const visitPhotoName = photoMatch[1];
      rawRemarks = rawRemarks.replace(photoMatch[0], '').trim();
      visitPhotoHtml = `<img src="/uploads/home_visits/${visitPhotoName}" class="max-h-[200px] object-contain mx-auto" alt="Home Visit Photo" onerror="this.style.display='none'" />`;
    }

    detailsContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        
        <!-- Applicant Profile -->
        <div class="bg-slate-50 dark:bg-[#0B1121] p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 class="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            <i class="fa-regular fa-id-card mr-2"></i>Applicant Profile
          </h3>
          <div class="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p><strong>Name:</strong> ${app.Full_Name}</p>
            <p><strong>NIC:</strong> ${app.NIC}</p>
            <p><strong>Address:</strong> ${app.Address}</p>
            <p><strong>DOB:</strong> ${new Date(app.DOB).toLocaleDateString()} &nbsp; | &nbsp; <strong>Gender:</strong> ${app.Gender}</p>
          </div>
        </div>

        <!-- Welfare Request Data -->
        <div class="bg-slate-50 dark:bg-[#0B1121] p-5 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 class="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            <i class="fa-solid fa-file-invoice mr-2"></i>Welfare Request Data
          </h3>
          <div class="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p><strong>Req ID:</strong> #${app.Request_ID}</p>
            <p><strong>App ID:</strong> #${app.Application_ID}</p>
            <p><strong>Declared Income:</strong> LKR ${Number(app.Monthly_Income).toLocaleString()}</p>
            <p><strong>Dependents:</strong> ${app.Dependents}</p>
            <p><strong>Reason:</strong> ${app.Reason}</p>
          </div>
        </div>

        <!-- Officer's Field Report -->
        <div class="bg-slate-50 dark:bg-[#0B1121] p-5 rounded-xl border border-slate-200 dark:border-slate-700 md:col-span-2">
          <h3 class="text-sm font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            <i class="fa-solid fa-clipboard-check mr-2"></i>Officer's Field Report
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic mb-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                "${rawRemarks}"
              </p>
              <p class="text-sm text-slate-700 dark:text-slate-300">
                <strong>Recommendation:</strong> 
                <span class="ml-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  ${app.Recommendation}
                </span>
              </p>
            </div>
            
            <div class="bg-slate-200 dark:bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-800 min-h-[140px]">
              ${visitPhotoHtml}
            </div>
          </div>
        </div>

        <!-- House Photograph -->
        <div class="bg-slate-50 dark:bg-[#0B1121] p-5 rounded-xl border border-slate-200 dark:border-slate-700 md:col-span-2">
          <h3 class="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            <i class="fa-solid fa-house mr-2"></i>House Photograph
          </h3>
          <div class="bg-slate-200 dark:bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-800 min-h-[200px] w-full">
            ${photoHtml}
          </div>
        </div>

        <!-- Payment Assignment -->
        <div class="bg-slate-50 dark:bg-[#0B1121] p-5 rounded-xl border border-slate-200 dark:border-slate-700 md:col-span-2 shadow-inner">
          <h3 class="text-sm font-bold text-amber-500 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            <i class="fa-solid fa-coins mr-2"></i>Assign Monthly Payment Amount
          </h3>
          <div class="flex flex-col md:flex-row items-center gap-4">
            <p class="text-sm text-slate-700 dark:text-slate-300 flex-1">
              Please determine and assign the monthly Samurdhi payment amount for this beneficiary based on the officer's field report and declared income.
            </p>
            <div class="relative w-full md:w-1/3">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-bold">LKR</span>
              <input type="number" id="assigned-payment-amount" class="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 5000" min="1000" step="500">
            </div>
          </div>
        </div>

      </div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentRequestId = null;
  }

  closeModalBtn.addEventListener('click', closeModal);

  // Close modal when clicking on overlay
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  async function handleAction(action) {
    if (!currentRequestId) return;

    let payload = { action };

    // If approving, validate that the Minister entered a payment amount
    if (action === 'Approve') {
      const amountInput = document.getElementById('assigned-payment-amount');
      const amount = amountInput ? parseFloat(amountInput.value) : 0;
      
      if (!amount || amount <= 0) {
        alert('Please enter a valid monthly payment amount to assign to this beneficiary.');
        return;
      }
      payload.amount = amount;
    }

    if (!confirm(`Are you sure you want to ${action.toUpperCase()} this application?`)) {
      return;
    }

    try {
      const response = await authFetch(`/api/minister/approvals/${currentRequestId}/action`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert(response.message || `Application ${action}d successfully.`);
      closeModal();
      loadApprovals(); // Refresh queue
    } catch (err) {
      console.error(err);
      alert(err.message || 'Action failed.');
    }
  }

  approveBtn.addEventListener('click', () => handleAction('Approve'));
  rejectBtn.addEventListener('click', () => handleAction('Reject'));

});
