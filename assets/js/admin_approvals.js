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
        tr.innerHTML = `
          <td>#REQ-${app.Request_ID}</td>
          <td>${app.Full_Name}</td>
          <td>${app.NIC}</td>
          <td>${new Date().toLocaleDateString()}</td> <!-- Can use wa.Date_Submitted if added to fetch -->
          <td>
            <button class="btn btn-sm btn-primary view-btn" data-app='${JSON.stringify(app)}'>Review</button>
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
    let photoHtml = '<p class="text-muted">No photo uploaded.</p>';
    if (app.House_Photo) {
      photoHtml = `<img src="/uploads/houses/${app.House_Photo}" class="house-photo-preview" alt="House Photo" />`;
    }

    detailsContainer.innerHTML = `
      <div class="details-grid">
        <div class="detail-section">
          <h3>Applicant Details</h3>
          <p><strong>Name:</strong> ${app.Full_Name}</p>
          <p><strong>NIC:</strong> ${app.NIC}</p>
          <p><strong>Address:</strong> ${app.Address}</p>
          <p><strong>DOB:</strong> ${new Date(app.DOB).toLocaleDateString()}</p>
          <p><strong>Gender:</strong> ${app.Gender}</p>
        </div>
        <div class="detail-section">
          <h3>Welfare Data</h3>
          <p><strong>Income:</strong> LKR ${app.Monthly_Income}</p>
          <p><strong>Dependents:</strong> ${app.Dependents}</p>
          <p><strong>Reason:</strong> ${app.Reason}</p>
        </div>
        <div class="detail-section full-width">
          <h3>Officer's Home Visit Report</h3>
          <p class="officer-notes"><strong>Notes:</strong> ${app.Officer_Remarks || 'None'}</p>
          <p class="officer-recommendation"><strong>Recommendation:</strong> ${app.Recommendation}</p>
        </div>
        <div class="detail-section full-width">
          <h3>House Photograph</h3>
          <div class="photo-container">
            ${photoHtml}
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

    if (!confirm(`Are you sure you want to ${action.toUpperCase()} this application?`)) {
      return;
    }

    try {
      const response = await authFetch(`/api/minister/approvals/${currentRequestId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action })
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
