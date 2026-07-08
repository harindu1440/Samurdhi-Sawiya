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

  // 3. Helper for Status Colors (Tailwind Classes)
  const getStatusStyles = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('pending')) {
      return {
        classes: 'text-amber-700 bg-amber-100 border border-amber-200',
        icon: '<i class="fa-solid fa-clock"></i>',
        desc: 'Your application is currently under review by the Grama Niladhari.'
      };
    }
    if (s.includes('gn_approved') || s.includes('gn approved')) {
      return {
        classes: 'text-blue-700 bg-blue-100 border border-blue-200',
        icon: '<i class="fa-solid fa-file-signature"></i>',
        desc: 'Approved by Grama Niladhari. Awaiting final Samurdhi Officer review.'
      };
    }
    if (s.includes('approved')) {
      return {
        classes: 'text-emerald-700 bg-emerald-100 border border-emerald-200',
        icon: '<i class="fa-solid fa-check-circle"></i>',
        desc: 'Congratulations, your application has been fully approved.'
      };
    }
    if (s.includes('rejected')) {
      return {
        classes: 'text-rose-700 bg-rose-100 border border-rose-200',
        icon: '<i class="fa-solid fa-circle-xmark"></i>',
        desc: 'Your application has been rejected. Please lodge a complaint if you need assistance.'
      };
    }
    // Default
    return {
      classes: 'text-slate-600 bg-slate-100 border border-slate-200',
      icon: '<i class="fa-solid fa-circle-info"></i>',
      desc: 'Status unknown or processing.'
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
      if (elProfileIncome) elProfileIncome.textContent = formatCurrency(dashData.profile?.monthly_income);

      // Update Status Widget
      if (dashData.latest_application) {
        const app = dashData.latest_application;
        const styles = getStatusStyles(app.app_status);
        
        elStatusBadge.className = `inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${styles.classes}`;
        elStatusBadge.innerHTML = `${styles.icon} ${app.app_status}`;
        elStatusDesc.textContent = styles.desc;
        
        elAppDate.textContent = formatDate(app.date);
        elAppId.textContent = `APP-${app.application_id}`;
      } else {
        elStatusBadge.className = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold text-slate-500 bg-slate-100 border border-slate-200';
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
            ? `<span class="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold border border-amber-200">Pending</span>`
            : `<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200">Disbursed</span>`;
            
          const tr = document.createElement('tr');
          tr.className = 'table-row-hover border-b border-slate-50 last:border-0';
          tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">${formatDate(p.date)}</td>
            <td class="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">LKR ${formatCurrency(p.payment)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-xs text-slate-400 font-mono">PAY-${p.sp_id.toString().padStart(4, '0')}</td>
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

  // 6. Init GSAP Animations (staggered entrance)
  if (typeof gsap !== 'undefined') {
    gsap.from('.dashboard-header', { duration: 0.8, y: -20, opacity: 0, ease: 'power3.out' });
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
