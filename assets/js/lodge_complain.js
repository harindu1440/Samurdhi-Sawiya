document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('complaint-form');
  const subjectInput = document.getElementById('complaint-subject');
  const messageInput = document.getElementById('complaint-message');
  const submitBtn = document.getElementById('submit-complaint-btn');
  const complaintsBody = document.getElementById('complaints-body');
  const userNameNode = document.getElementById('user-name');

  const escapeHtml = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Fetch applicant name for header
  try {
    const res = await authFetch('/api/applicant/status');
    if (res && res.status === 'success' && res.data) {
      if (userNameNode) userNameNode.textContent = res.data.Full_Name || 'Applicant';
    }
  } catch (err) {
    console.error('Error fetching applicant name:', err);
  }

  const loadComplaints = async () => {
    try {
      const res = await authFetch('/api/applicant/complaints');
      if (res && res.status === 'success' && res.data) {
        if (res.data.length === 0) {
          complaintsBody.innerHTML = `<tr><td colspan="4" class="empty-state" style="padding: 30px; text-align: center; color: var(--muted);">You have not lodged any complaints yet.</td></tr>`;
          return;
        }

        complaintsBody.innerHTML = res.data.map(c => {
          const date = new Date(c.Created_At).toLocaleDateString();
          const badgeClass = c.Status === 'Resolved' ? 'status-resolved' : 'status-pending';
          
          return `
            <tr style="border-bottom: 1px solid var(--border);">
              <td style="padding: 12px; white-space: nowrap;">${escapeHtml(date)}</td>
              <td style="padding: 12px; font-weight: 500;">${escapeHtml(c.Subject)}</td>
              <td style="padding: 12px; color: var(--muted); max-width: 300px;">
                <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(c.Message)}">
                  ${escapeHtml(c.Message)}
                </div>
              </td>
              <td style="padding: 12px;">
                <span class="status-badge ${badgeClass}">${escapeHtml(c.Status)}</span>
              </td>
            </tr>
          `;
        }).join('');
      } else {
        throw new Error(res?.message || 'Failed to load complaints');
      }
    } catch (err) {
      console.error(err);
      complaintsBody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color: red; padding: 20px; text-align: center;">Error loading complaints.</td></tr>`;
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();

    if (!subject || !message) {
      alert('Please fill out both the subject and the message.');
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    try {
      const res = await authFetch('/api/applicant/complaints', {
        method: 'POST',
        body: JSON.stringify({ subject, message })
      });

      if (res && res.status === 'success') {
        alert('Complaint lodged successfully.');
        form.reset();
        loadComplaints();
      } else {
        alert(res?.message || 'An error occurred while lodging your complaint.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while lodging complaint.');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  // Init
  if (typeof gsap !== 'undefined') {
    gsap.from('.dashboard-anim-item', { opacity: 0, y: 20, duration: 0.5, stagger: 0.1 });
  }
  loadComplaints();
});
