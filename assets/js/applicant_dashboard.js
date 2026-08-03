// ─────────────────────────────────────────────────────────────────────────────
// applicant_dashboard.js — Applicant dashboard logic
// Requires api-client.js to be loaded first.
// Fetches status and payments from the backend and updates the Tailwind UI.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify Session
  const session = getSession('Applicant');
  if (!session) return; // API client handles redirect

  const userNameNode = document.getElementById('user-name');
  const userDivisionNode = document.getElementById('user-division');
  if (userNameNode) userNameNode.textContent = session.name || 'Applicant';

  // 2. DOM Elements
  const elProfileName = document.getElementById('profile-name');
  const elProfileIncome = document.getElementById('profile-income');
  
  const elStatusBadge = document.getElementById('status-badge');
  const elStatusDesc = document.getElementById('status-desc');
  const elAppDate = document.getElementById('app-date');
  const elAppId = document.getElementById('app-id');
  
  const elPaymentCount = document.getElementById('payment-count');
  const elPaymentTbody = document.getElementById('payment-tbody');

  // 3. Helper for Status Colors (Vanilla CSS Classes)
  const getStatusStyles = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('update_required') || s.includes('update required')) {
      return {
        classes: 'badge badge-rejected',
        icon: '<i class="fa-solid fa-triangle-exclamation"></i>',
        desc: 'Your application requires updates before it can be processed.'
      };
    }
    if (s.includes('pending')) {
      return {
        classes: 'badge badge-pending',
        icon: '<i class="fa-solid fa-clock"></i>',
        desc: 'Your application is currently under review.'
      };
    }
    if (s.includes('officer_approved') || s.includes('officer approved')) {
      return {
        classes: 'badge badge-approved',
        icon: '<i class="fa-solid fa-user-check"></i>',
        desc: 'Approved by Samurdhi Officer. Awaiting Grama Niladhari Review.',
        display: 'Approved by Officer'
      };
    }
    if (s.includes('gn_approved') || s.includes('gn approved') || s.includes('gn_reviewed')) {
      return {
        classes: 'badge badge-approved',
        icon: '<i class="fa-solid fa-file-signature"></i>',
        desc: 'Approved by Grama Niladhari. Awaiting Final Approval from Minister.',
        display: 'Approved by GN'
      };
    }
    if (s.includes('minister_approved') || s.includes('minister approved')) {
      return {
        classes: 'badge badge-approved',
        icon: '<i class="fa-solid fa-check-circle"></i>',
        desc: 'Congratulations, your application has been fully approved by the Minister.',
        display: 'Fully Approved'
      };
    }
    if (s.includes('approved')) {
      // Fallback for any other generic 'approved'
      return {
        classes: 'badge badge-approved',
        icon: '<i class="fa-solid fa-check-circle"></i>',
        desc: 'Your application has been approved.',
        display: 'Approved'
      };
    }
    if (s.includes('rejected')) {
      return {
        classes: 'badge badge-rejected',
        icon: '<i class="fa-solid fa-circle-xmark"></i>',
        desc: 'Your application has been rejected.',
        display: 'Rejected'
      };
    }
    // Default
    return {
      classes: 'badge badge-default',
      icon: '<i class="fa-solid fa-circle-info"></i>',
      desc: 'Status unknown or processing.',
      display: status.replace('_', ' ')
    };
  };

  const formatDate = (isoString) => {
    if (!isoString) return '--/--/----';
    return new Date(isoString).toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '--';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 4. Fetch Dashboard Overview
  try {
    const dashData = await authFetch('/api/applicant/dashboard');
    if (dashData && dashData.status === 'success') {
      
      // Update Profile
      if (elProfileName) elProfileName.textContent = dashData.name || session.name;
      if (userNameNode) userNameNode.textContent = dashData.name || session.name;
      if (userDivisionNode) {
        userDivisionNode.textContent = dashData.division || 'Unassigned';
      }
      if (elProfileIncome) elProfileIncome.textContent = formatCurrency(dashData.profile?.monthly_income);

      // Update Status Widget
      if (dashData.latest_application) {
        const app = dashData.latest_application;
        const styles = getStatusStyles(app.app_status);
        
        elStatusBadge.className = `inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${styles.classes}`;
        elStatusBadge.innerHTML = `${styles.icon} ${styles.display || app.app_status.replace('_', ' ')}`;
        elStatusDesc.textContent = styles.desc;
        
        elAppDate.textContent = formatDate(app.date);
        elAppId.textContent = `APP-${app.application_id}`;

        if (app.app_status === 'Update_Required') {
          const alertEl = document.getElementById('update-required-alert');
          const reasonEl = document.getElementById('update-reason-text');
          if (alertEl && reasonEl) {
            reasonEl.textContent = dashData.latest_application.update_reason || 'Please review your application and provide the missing details.';
            alertEl.style.display = 'block';
            
            // Pass the application details via localStorage so the edit page can use them easily
            localStorage.setItem('editApplicationData', JSON.stringify(dashData));
          }
        } else {
          const alertEl = document.getElementById('update-required-alert');
          if (alertEl) alertEl.style.display = 'none';
        }
      } else {
        elStatusBadge.className = 'badge badge-default';
        elStatusBadge.innerHTML = '<i class="fa-solid fa-folder-open"></i> No Application';
        elStatusDesc.textContent = 'We could not find an active welfare application for your account.';
      }
    }
  } catch (err) {
    console.error('Failed to fetch dashboard overview:', err);
    elStatusBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error loading status';
  }

  // 5. Fetch Payment History
  try {
    const payData = await authFetch('/api/applicant/payments');
    if (payData && payData.status === 'success') {
      const payments = payData.payments || [];
      
      elPaymentCount.textContent = `${payments.length} record${payments.length !== 1 ? 's' : ''}`;
      
      if (payments.length === 0) {
        elPaymentTbody.innerHTML = `
          <tr>
            <td colspan="4" class="px-6 py-12 text-center text-slate-500 bg-white">
              <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 text-slate-300">
                <i class="fa-solid fa-receipt"></i>
              </div>
              <p class="font-medium">No payments found</p>
              <p class="text-xs text-slate-400 mt-1">When payments are disbursed, they will appear here.</p>
            </td>
          </tr>`;
      } else {
        elPaymentTbody.innerHTML = ''; // clear loading state
        
        // Show up to 5 most recent payments
        payments.slice(0, 5).forEach(p => {
          const isPending = p.p_status.toLowerCase() === 'pending';
          const statusBadge = isPending 
            ? `<span class="badge badge-pending badge-sm">Pending</span>`
            : `<span class="badge badge-approved badge-sm">Disbursed</span>`;
            
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${formatDate(p.date)}</td>
            <td class="col-amount">LKR ${formatCurrency(p.payment)}</td>
            <td>${statusBadge}</td>
            <td class="col-ref">PAY-${p.sp_id.toString().padStart(4, '0')}</td>
          `;
          elPaymentTbody.appendChild(tr);
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch payment history:', err);
    elPaymentTbody.innerHTML = `
      <tr>
        <td colspan="4" class="px-6 py-8 text-center text-rose-500 bg-white">
          <i class="fa-solid fa-circle-exclamation mb-2 text-xl"></i>
          <p>Failed to load payment history.</p>
        </td>
      </tr>`;
  }

  // 6. Fetch Notifications
  try {
    const notifData = await authFetch('/api/applicant/notifications');
    if (notifData && notifData.status === 'success') {
      const notifications = notifData.data || [];
      const badge = document.getElementById('notification-badge');
      const list = document.getElementById('notification-list');
      
      if (notifications.length > 0) {
        if (badge) badge.style.display = 'block';
        list.innerHTML = notifications.map(n => `
          <div class="notification-item ${n.type}">
            <p class="notification-message">${n.message}</p>
            <p class="notification-date">${formatDate(n.date)}</p>
          </div>
        `).join('');
      } else {
        if (badge) badge.style.display = 'none';
        list.innerHTML = '<div class="notification-empty">No new notifications</div>';
      }
    }
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
  }

  // 7. Notification Dropdown Toggle
  const notifBtn = document.getElementById('notification-btn');
  const notifDropdown = document.getElementById('notification-dropdown');
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
        notifDropdown.classList.remove('active');
      }
    });
  }

  // 8. Init GSAP Animations (staggered entrance)
  if (typeof gsap !== 'undefined') {
    gsap.from('.dashboard-anim-item', { 
      duration: 0.8, 
      y: 30, 
      opacity: 0, 
      stagger: 0.1, 
      delay: 0.1, 
      ease: 'power3.out' 
    });
  }
});
