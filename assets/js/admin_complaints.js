// ─────────────────────────────────────────────────────────────────────────────
// admin_complaints.js — Minister Applicant Complaints page
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const page           = document.querySelector('[data-complaints-page]');
  const adminNameNode  = document.getElementById('admin-name');
  const pageStatus     = document.getElementById('page-status');
  const complaintsBody = document.getElementById('complaints-body');
  const complaintsBadge= document.getElementById('complaints-badge');
  const complaintsCount= document.getElementById('complaints-count');
  const statusFilter   = document.getElementById('status-filter');

  if (!page) return;

  const escapeHtml = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  let allComplaints = [];

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderComplaints = (complaints) => {
    if (!complaints || complaints.length === 0) {
      complaintsBody.innerHTML = `<tr><td colspan="7" class="empty-state">No complaints found.</td></tr>`;
      if (complaintsCount) complaintsCount.textContent = '0 complaints';
      return;
    }

    if (complaintsCount) complaintsCount.textContent = `${complaints.length} complaint${complaints.length !== 1 ? 's' : ''}`;

    complaintsBody.innerHTML = complaints.map((c) => {
      const isResolved = c.Status === 'Resolved';
      const badgeClass = isResolved ? 'badge-resolved' : 'badge-pending';
      const rowStyle   = isResolved ? 'opacity: 0.6;' : '';

      return `
        <tr data-id="${escapeHtml(String(c.Complaint_ID))}" style="${rowStyle}">
          <td style="white-space: nowrap;">${escapeHtml(formatDate(c.Created_At))}</td>
          <td style="font-weight: 500;">${escapeHtml(c.Applicant_Name || '—')}</td>
          <td style="font-family: monospace; font-size: 0.85em;">${escapeHtml(c.Applicant_NIC || '—')}</td>
          <td style="font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(c.Subject)}">${escapeHtml(c.Subject)}</td>
          <td>
            <div class="complaint-msg" title="${escapeHtml(c.Message)}">${escapeHtml(c.Message)}</div>
            <button class="expand-btn" data-full="${escapeHtml(c.Message)}">Read more</button>
          </td>
          <td><span class="status-badge ${badgeClass}">${escapeHtml(c.Status)}</span></td>
          <td>
            ${isResolved
              ? '<span style="color: #16a34a; font-size: 0.8rem;"><i class="fa-solid fa-check"></i> Closed</span>'
              : `<button class="resolve-btn" data-complaint-id="${escapeHtml(String(c.Complaint_ID))}"><i class="fa-solid fa-check-circle"></i> Resolve</button>`
            }
          </td>
        </tr>
      `;
    }).join('');

    if (typeof gsap !== 'undefined') {
      gsap.from('#complaints-body tr', { duration: 0.4, opacity: 0, y: 10, stagger: 0.04, ease: 'power2.out' });
    }

    // Attach resolve listeners
    complaintsBody.querySelectorAll('.resolve-btn').forEach((btn) => {
      btn.addEventListener('click', () => resolveComplaint(btn.dataset.complaintId, btn));
    });

    // Attach expand listeners
    complaintsBody.querySelectorAll('.expand-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const msg = btn.dataset.full;
        btn.previousElementSibling.textContent = msg;
        btn.style.display = 'none';
      });
    });
  };

  const applyFilter = () => {
    const filterVal = statusFilter ? statusFilter.value : 'All';
    const filtered = filterVal === 'All' ? allComplaints : allComplaints.filter(c => c.Status === filterVal);
    renderComplaints(filtered);
  };

  const resolveComplaint = async (id, btn) => {
    if (!confirm('Mark this complaint as Resolved?')) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const res = await authFetch(`/api/minister/complaints/${id}/resolve`, { method: 'POST' });
      if (res && res.status === 'success') {
        // Update local data and re-render
        const complaint = allComplaints.find(c => String(c.Complaint_ID) === String(id));
        if (complaint) complaint.Status = 'Resolved';
        applyFilter();
      } else {
        alert(res?.message || 'Failed to resolve complaint.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Resolve';
      }
    } catch (err) {
      console.error(err);
      alert('Network error while resolving complaint.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Resolve';
    }
  };

  // Load admin name
  try {
    const meRes = await authFetch('/api/admin/dashboard');
    if (meRes && meRes.status === 'success') {
      if (adminNameNode) adminNameNode.textContent = meRes.data?.Minister_Name || 'Minister';
    }
  } catch (_) { /* silent */ }

  // Load complaints
  if (pageStatus) pageStatus.textContent = 'Loading...';
  try {
    const res = await authFetch('/api/minister/complaints');
    if (res && res.status === 'success') {
      allComplaints = res.data || [];
      if (complaintsBadge) complaintsBadge.textContent = `${allComplaints.length} complaint${allComplaints.length !== 1 ? 's' : ''}`;
      if (pageStatus) pageStatus.textContent = 'Loaded';
      applyFilter();
    } else {
      throw new Error(res?.message || 'Failed to load complaints');
    }
  } catch (err) {
    console.error('[admin_complaints.js]', err);
    if (pageStatus) pageStatus.textContent = 'Error';
    complaintsBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:#ef4444;">Failed to load complaints. Please refresh.</td></tr>`;
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', applyFilter);
  }
});
