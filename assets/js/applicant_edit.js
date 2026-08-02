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

      document.getElementById('Name').value = applicant.Full_Name || '';
      document.getElementById('NIC').value = applicant.NIC || '';
      document.getElementById('Address').value = applicant.Address || '';
      document.getElementById('DOB').value = applicant.DOB ? applicant.DOB.substring(0, 10) : '';
      document.getElementById('Gender').value = applicant.Gender || '';
      document.getElementById('Division').value = applicant.Division || '';
      document.getElementById('Bank_Name').value = applicant.Bank_Name || '';
      document.getElementById('Branch').value = applicant.Branch || '';
      document.getElementById('Account_Name').value = applicant.Account_Name || '';
      document.getElementById('Account_Number').value = applicant.Account_Number || '';
      document.getElementById('Monthly_Income').value = applicant.Monthly_Income || '';
      document.getElementById('Dependents').value = applicant.Dependents || '';
      document.getElementById('Reason').value = applicant.Reason || '';
      
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
      Name: document.getElementById('Name').value.trim(),
      NIC: document.getElementById('NIC').value.trim(),
      Address: document.getElementById('Address').value.trim(),
      DOB: document.getElementById('DOB').value,
      Gender: document.getElementById('Gender').value,
      Division: document.getElementById('Division').value,
      Bank_Name: document.getElementById('Bank_Name').value.trim(),
      Branch: document.getElementById('Branch').value.trim(),
      Account_Name: document.getElementById('Account_Name').value.trim(),
      Account_Number: document.getElementById('Account_Number').value.trim(),
      Monthly_Income: document.getElementById('Monthly_Income').value,
      Dependents: document.getElementById('Dependents').value,
      Reason: document.getElementById('Reason').value.trim()
    };

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
});
