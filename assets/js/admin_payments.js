// admin_payments.js
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const adminNameNode = document.getElementById('admin-name');
  const tbody = document.getElementById('payments-tbody');

  try {
    const session = getSession('Minister') || getSession('Admin');
    if (adminNameNode) adminNameNode.textContent = session?.name || 'Minister';

    await loadPayments();

  } catch (err) {
    console.error('Session error:', err);
    window.location.href = 'login.html';
  }

  // Load payments from backend
  async function loadPayments() {
    try {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-slate-400 text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading payment history...</td></tr>';
      const response = await authFetch('/api/admin/payments');
      
      if (!response || !response.data || response.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-slate-500 text-sm">No payment records found.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      response.data.forEach(payment => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-700/50';
        
        let statusBadge = '';
        if (payment.Status === 'Completed' || payment.Status === 'Paid') {
          statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">Paid</span>';
        } else {
          statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30">Pending</span>';
        }

        tr.innerHTML = `
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">#PAY-${payment.Payment_ID}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-bold">${payment.applicant_name}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${payment.NIC || 'N/A'}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200">${new Date(payment.Date).toLocaleDateString()}</td>
          <td class="px-6 py-4 text-slate-800 dark:text-slate-200 font-bold">LKR ${Number(payment.Amount).toLocaleString()}</td>
          <td class="px-6 py-4">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
      });

    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-red-500 text-sm">Failed to load payment history.</td></tr>';
    }
  }

});
