document.addEventListener('DOMContentLoaded', async () => {
  const session = getSession('Applicant');
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const editForm = document.getElementById('edit-form');
  const errorBox = document.getElementById('error-box');
  const errorMsg = document.getElementById('error-msg');
  const successBox = document.getElementById('success-box');
  const successMsg = document.getElementById('success-msg');
  const submitBtn = document.getElementById('submit-btn');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorBox.hidden = false;
    successBox.hidden = true;
    gsap.fromTo(errorBox, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 });
  }

  function showSuccess(msg) {
    successMsg.textContent = msg;
    successBox.hidden = false;
    errorBox.hidden = true;
    gsap.fromTo(successBox, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 });
  }

  // Load data
  try {
    const data = await authFetch('/api/applicant/application/edit-data');
    if (data && data.status === 'success' && data.data) {
      const applicant = data.data;

      document.getElementById('fullName').value = applicant.Full_Name || '';
      document.getElementById('nic').value = applicant.NIC || '';
      document.getElementById('address').value = applicant.Address || '';
      document.getElementById('dob').value = applicant.DOB ? applicant.DOB.substring(0, 10) : '';
      document.getElementById('gender').value = applicant.Gender || '';
      document.getElementById('division').value = applicant.Division || '';
      document.getElementById('bank_name').value = applicant.Bank_Name || '';
      document.getElementById('branch').value = applicant.Branch || '';
      document.getElementById('account_name').value = applicant.Account_Name || '';
      document.getElementById('account_number').value = applicant.Account_Number || '';
      document.getElementById('monthlyIncome').value = applicant.Monthly_Income || '';
      document.getElementById('dependents').value = applicant.Dependents || '';
      document.getElementById('reason').value = applicant.Reason || '';
      
      if (applicant.Bank_Name && applicant.Branch && applicant.Account_Name && applicant.Account_Number) {
        document.getElementById('open-bank-modal-btn').style.display = 'none';
        document.getElementById('bank-status-msg').style.display = 'flex';
      }

      if (applicant.Status !== 'Update_Required') {
        showError("Your application does not currently require updates.");
        submitBtn.disabled = true;
      } else if (applicant.Update_Reason) {
        // Show reason
        const reasonBox = document.createElement('div');
        reasonBox.className = 'error-box';
        reasonBox.style.background = 'rgba(245, 158, 11, 0.1)';
        reasonBox.style.color = '#d97706';
        reasonBox.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        reasonBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span><strong>Update requested:</strong> ${applicant.Update_Reason}</span>`;
        editForm.parentNode.insertBefore(reasonBox, editForm);
      }
    } else {
      showError('Failed to load application data.');
    }
  } catch (err) {
    console.error(err);
    showError('Network error loading data.');
  }

  // Submit form
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    successBox.hidden = true;

    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    const payload = {
      Name: document.getElementById('fullName').value.trim(),
      NIC: document.getElementById('nic').value.trim(),
      Address: document.getElementById('address').value.trim(),
      DOB: document.getElementById('dob').value,
      Gender: document.getElementById('gender').value,
      Division: document.getElementById('division').value,
      Bank_Name: document.getElementById('bank_name').value.trim(),
      Branch: document.getElementById('branch').value.trim(),
      Account_Name: document.getElementById('account_name').value.trim(),
      Account_Number: document.getElementById('account_number').value.trim(),
      Monthly_Income: document.getElementById('monthlyIncome').value,
      Dependents: document.getElementById('dependents').value,
      Reason: document.getElementById('reason').value.trim()
    };

    if (!payload.Bank_Name || !payload.Account_Number) {
        showError('Please add your bank details before submitting.');
        submitBtn.innerHTML = '<span>Submit Updates</span> <i class="fa-solid fa-arrow-right"></i>';
        submitBtn.disabled = false;
        return;
    }

    try {
      const response = await fetch('/api/applicant/application/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();

      if (response.ok && resData.status === 'success') {
        showSuccess('Application updated successfully. Redirecting to dashboard...');
        setTimeout(() => {
          window.location.href = 'applicant_dashboard.html';
        }, 2000);
      } else {
        showError(resData.message || 'Error updating application.');
        submitBtn.innerHTML = '<span>Submit Updates</span> <i class="fa-solid fa-arrow-right"></i>';
        submitBtn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      showError('Network error occurred.');
      submitBtn.innerHTML = '<span>Submit Updates</span> <i class="fa-solid fa-arrow-right"></i>';
      submitBtn.disabled = false;
    }
  });

  // ── Bank Details Modal Logic ──────────────────────────────────────────────
  const openBankModalBtn = document.getElementById('open-bank-modal-btn');
  const closeBankModalBtn = document.getElementById('close-bank-modal');
  const saveBankBtn = document.getElementById('save-bank-btn');
  const bankModal = document.getElementById('bank-modal');
  const bankModalError = document.getElementById('bank-modal-error');
  const bankStatusMsg = document.getElementById('bank-status-msg');

  if (openBankModalBtn && bankModal) {
    openBankModalBtn.addEventListener('click', () => {
      // Pre-fill if already saved
      document.getElementById('modal_bank_name').value = document.getElementById('bank_name').value;
      document.getElementById('modal_branch').value = document.getElementById('branch').value;
      document.getElementById('modal_account_name').value = document.getElementById('account_name').value;
      document.getElementById('modal_account_number').value = document.getElementById('account_number').value;
      bankModalError.style.display = 'none';
      bankModal.style.display = 'flex';
      
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(bankModal.firstElementChild, { y: 30, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' });
      }
    });
  }

  if (closeBankModalBtn && bankModal) {
    closeBankModalBtn.addEventListener('click', () => {
      if (typeof gsap !== 'undefined') {
        gsap.to(bankModal.firstElementChild, { y: 20, opacity: 0, scale: 0.95, duration: 0.2, ease: 'power2.in', onComplete: () => bankModal.style.display = 'none' });
      } else {
        bankModal.style.display = 'none';
      }
    });
  }

  if (saveBankBtn) {
    saveBankBtn.addEventListener('click', () => {
      const mbName = document.getElementById('modal_bank_name').value.trim();
      const mbBranch = document.getElementById('modal_branch').value.trim();
      const mbAccName = document.getElementById('modal_account_name').value.trim();
      const mbAccNum = document.getElementById('modal_account_number').value.trim();
      
      if (!mbName || !mbBranch || !mbAccName || !mbAccNum) {
        bankModalError.textContent = 'All fields are required.';
        bankModalError.style.display = 'block';
        return;
      }
      if (!/^[0-9]+$/.test(mbAccNum)) {
        bankModalError.textContent = 'Account number must contain only digits.';
        bankModalError.style.display = 'block';
        return;
      }
      
      // Save to hidden inputs
      document.getElementById('bank_name').value = mbName;
      document.getElementById('branch').value = mbBranch;
      document.getElementById('account_name').value = mbAccName;
      document.getElementById('account_number').value = mbAccNum;
      
      // Close modal and show success status
      if (typeof gsap !== 'undefined') {
        gsap.to(bankModal.firstElementChild, { y: 20, opacity: 0, scale: 0.95, duration: 0.2, ease: 'power2.in', onComplete: () => bankModal.style.display = 'none' });
      } else {
        bankModal.style.display = 'none';
      }
      
      openBankModalBtn.style.display = 'none';
      bankStatusMsg.style.display = 'flex';
    });
  }
});
