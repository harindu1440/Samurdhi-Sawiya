// ─────────────────────────────────────────────────────────────────────────────
// register.js — Applicant Self-Registration + Welfare Application Submission
// Validates form, sends POST to /api/auth/register, handles success/error.
// Does NOT require api-client.js — this is a fully public page.
// ─────────────────────────────────────────────────────────────────────────────

const locationData = {
  'Akmeemana': ['Akmeemana', 'Pinnaduwa', 'Koggala', 'Meegoda', 'Walahanduwa'],
  'Ambalangoda': ['Ambalangoda Town', 'Maha Ambalangoda', 'Polwatta', 'Kaluwadumulla', 'Patabendimulla'],
  'Baddegama': ['Baddegama', 'Hikkaduwa Road', 'Sandarawala', 'Gammeddegoda', 'Majana'],
  'Balapitiya': ['Balapitiya', 'Wathurawila', 'Brahmanawattha', 'Hegalla', 'Ahungalla'],
  'Benthota': ['Benthota', 'Induruwa', 'Haburugala', 'Athuruwella', 'Miriswatta'],
  'Bope-Poddala': ['Bope', 'Poddala', 'Wakwella', 'Uluwitike', 'Narawala'],
  'Elpitiya': ['Elpitiya', 'Igala', 'Wallambagala', 'Awiththawa', 'Kahaduwa'],
  'Galle Four Gravets': ['Fort', 'Mahamodara', 'Dadalla', 'Karapitiya', 'Milidduwa', 'Gintota'],
  'Gonapinuwala': ['Gonapinuwala', 'Uragasmanhandiya', 'Magedara'],
  'Habaraduwa': ['Unawatuna', 'Talpe', 'Koggala', 'Ahangama', 'Kathaluwa', 'Harumalgoda'],
  'Hikkaduwa': ['Hikkaduwa', 'Narigama', 'Dodanduwa', 'Thiranagama', 'Patuwatha'],
  'Imaduwa': ['Imaduwa', 'Kodagoda', 'Kodikara', 'Mawella'],
  'Karandeniya': ['Karandeniya', 'Uragaha', 'Kurundugahahetekma'],
  'Nagoda': ['Nagoda', 'Yatalamatta', 'Mapalagama', 'Udugama'],
  'Neluwa': ['Neluwa', 'Thawalama', 'Lankagama', 'Dellawa'],
  'Niyagama': ['Niyagama', 'Mattaka', 'Pitigala'],
  'Thawalama': ['Thawalama', 'Opatha', 'Hiniduma', 'Udugama'],
  'Welivitiya-Divitura': ['Welivitiya', 'Divitura', 'Ampegama'],
  'Yakkalamulla': ['Yakkalamulla', 'Nakiyadeniya', 'Magedara', 'Karagoda']
};

document.addEventListener('DOMContentLoaded', () => {
  const form            = document.getElementById('register-form');
  const errorBox        = document.getElementById('error-box');
  const successBox      = document.getElementById('success-box');
  const successMessage  = document.getElementById('success-message');
  const registerBtn     = document.getElementById('register-btn');
  const passwordInput   = document.getElementById('password');
  const strengthBar     = document.getElementById('strength-bar');
  const housePhotoInput = document.getElementById('housePhoto');
  const housePhotoLabel = document.getElementById('housePhoto-label');
  const housePhotoChosen = document.getElementById('housePhoto-chosen');
  const divisionSelect  = document.getElementById('division');
  const gnDivisionSelect = document.getElementById('gnDivision');

  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const isOfficerMode = urlParams.get('mode') === 'officer';
  const officerId = urlParams.get('officer_id');

  if (isOfficerMode) {
    const loginLink = document.getElementById('login-link-footer');
    const disclaimer = document.getElementById('disclaimer-footer');
    if (loginLink) loginLink.style.display = 'none';
    if (disclaimer) disclaimer.style.display = 'none';
  }

  // Populate division dropdown
  if (divisionSelect) {
    Object.keys(locationData).forEach(div => {
      const option = document.createElement('option');
      option.value = div;
      option.textContent = div;
      divisionSelect.appendChild(option);
    });

    // Change event for division -> gnDivision
    divisionSelect.addEventListener('change', (e) => {
      const selectedDiv = e.target.value;
      
      // Reset gnDivision
      gnDivisionSelect.innerHTML = '<option value="" disabled selected hidden>Select GN Division</option>';
      gnDivisionSelect.disabled = true;

      if (selectedDiv && locationData[selectedDiv]) {
        locationData[selectedDiv].forEach(gn => {
          const option = document.createElement('option');
          option.value = gn;
          option.textContent = gn;
          gnDivisionSelect.appendChild(option);
        });
        gnDivisionSelect.disabled = false;
      }
    });
  }

  // ── Officer Mode: Auto-fill & lock Division fields ────────────────────────
  if (isOfficerMode && officerId) {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/officer/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success' && data.data) {
          const { Division, GN_Division } = data.data;

          // Set Division
          if (divisionSelect && Division) {
            divisionSelect.value = Division;
            divisionSelect.disabled = true;

            // Trigger change to populate GN Division options
            divisionSelect.dispatchEvent(new Event('change'));

            // Set GN_Division after options are populated
            setTimeout(() => {
              if (gnDivisionSelect && GN_Division) {
                gnDivisionSelect.value = GN_Division;
                gnDivisionSelect.disabled = true;
              }
            }, 50);
          }
        }
      })
      .catch(err => console.warn('Could not fetch officer profile for auto-fill:', err));
    }
  }

  // ── GSAP entrance animations ──────────────────────────────────────────────
  if (typeof gsap !== 'undefined') {
    gsap.from('.auth-visual', {
      duration: 0.95, x: -48, opacity: 0, ease: 'power3.out'
    });
    gsap.from('.auth-card', {
      duration: 0.95, x: 56, opacity: 0, delay: 0.1, ease: 'power3.out'
    });
    gsap.from('.auth-card-header, .auth-form, .auth-footer-note', {
      duration: 0.75, y: 22, opacity: 0, delay: 0.25, stagger: 0.12, ease: 'power2.out'
    });
  }

  // ── Live password strength indicator ──────────────────────────────────────
  passwordInput?.addEventListener('input', () => {
    const val = passwordInput.value;
    if (!strengthBar) return;

    strengthBar.className = 'password-strength-bar'; // reset

    if (val.length === 0) {
      strengthBar.style.width = '0%';
    } else if (val.length < 8) {
      strengthBar.classList.add('strength-weak');
    } else if (val.length < 12 || !/[A-Z]/.test(val) || !/[0-9]/.test(val)) {
      strengthBar.classList.add('strength-medium');
    } else {
      strengthBar.classList.add('strength-strong');
    }
  });

  // ── House photo — live filename preview + drag-and-drop feedback ────────────
  let housePhotoDT = new DataTransfer();

  function renderPhotoList() {
    if (!housePhotoChosen) return;
    const files = housePhotoDT.files;
    housePhotoInput.files = files; // Sync with input
    
    if (files && files.length > 0) {
      let fileListHtml = '<ul style="list-style: none; padding: 0; margin: 0; text-align: left; width: 100%;">';
      for (let i = 0; i < files.length; i++) {
        fileListHtml += `
          <li style="padding: 4px 8px; margin-bottom: 4px; background: rgba(0,0,0,0.05); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">✓ ${files[i].name}</span>
            <button type="button" class="remove-photo-btn" data-index="${i}" style="color: red; border: none; background: none; cursor: pointer; font-weight: bold; margin-left: 8px;">✕</button>
          </li>`;
      }
      fileListHtml += '</ul>';
      housePhotoChosen.innerHTML = fileListHtml;
      housePhotoChosen.hidden = false;
      if (housePhotoLabel) housePhotoLabel.style.borderColor = 'var(--accent)';
      
      // Attach remove event listeners
      const removeBtns = housePhotoChosen.querySelectorAll('.remove-photo-btn');
      removeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const indexToRemove = parseInt(e.target.getAttribute('data-index'), 10);
          const newDt = new DataTransfer();
          for(let i=0; i<housePhotoDT.files.length; i++) {
            if(i !== indexToRemove) newDt.items.add(housePhotoDT.files[i]);
          }
          housePhotoDT = newDt;
          renderPhotoList();
        });
      });
    } else {
      housePhotoChosen.innerHTML = '';
      housePhotoChosen.hidden = true;
      if (housePhotoLabel) housePhotoLabel.style.borderColor = '';
    }
  }

  housePhotoInput?.addEventListener('change', () => {
    housePhotoDT = new DataTransfer();
    for (let i = 0; i < housePhotoInput.files.length; i++) {
      housePhotoDT.items.add(housePhotoInput.files[i]);
    }
    renderPhotoList();
  });

  // Drag-and-drop onto the label
  housePhotoLabel?.addEventListener('dragover', (e) => {
    e.preventDefault();
    housePhotoLabel.classList.add('drag-over');
  });
  housePhotoLabel?.addEventListener('dragleave', () => {
    housePhotoLabel.classList.remove('drag-over');
  });
  housePhotoLabel?.addEventListener('drop', (e) => {
    e.preventDefault();
    housePhotoLabel.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0 && housePhotoInput) {
      housePhotoDT = new DataTransfer();
      for (let i = 0; i < files.length; i++) {
        housePhotoDT.items.add(files[i]);
      }
      renderPhotoList();
    }
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showError = (message) => {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
    if (successBox) successBox.hidden = true;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(errorBox, { x: -8, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    }
  };

  const clearError = () => {
    if (errorBox) { errorBox.textContent = ''; errorBox.hidden = true; }
  };

  const showSuccess = (message) => {
    // Only call after a confirmed 200/201 success response from the backend
    if (successBox) {
      successBox.hidden = false;
      if (successMessage) successMessage.textContent = message;
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(successBox, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.5)' });
      }
    }
    if (errorBox) errorBox.hidden = true;
  };

  const setLoading = (isLoading) => {
    if (!registerBtn) return;
    registerBtn.disabled = isLoading;
    registerBtn.innerHTML = isLoading
      ? '<span>Submitting…</span>'
      : '<span>Register &amp; Submit Application</span><i class="fa-solid fa-paper-plane"></i>';
  };

  // ── Form submit ───────────────────────────────────────────────────────────
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    // ── Section 1: Personal Information ─────────────────────────────────────
    const fullName    = String(form.full_name.value    || '').trim();
    const nic         = String(form.nic.value          || '').trim();
    const dob         = String(form.dob.value          || '').trim();
    const gender      = String(form.gender.value       || '').trim();
    const phoneNum    = String(form.phone_num.value    || '').trim();
    const division    = String(form.division.value     || '').trim();
    const gnDivision  = String(form.gnDivision.value   || '').trim();
    const address     = String(form.address.value      || '').trim();

    // ── Section 2: Account Credentials ──────────────────────────────────────
    const username        = String(form.username.value         || '').trim();
    const password        = String(form.password.value         || '');
    const confirmPassword = String(form.confirm_password.value || '');

    // ── Section 3: Application Details ──────────────────────────────────────
    const monthlyIncomeRaw = form.monthly_income.value;
    const monthlyIncome    = monthlyIncomeRaw !== '' ? parseFloat(monthlyIncomeRaw) : null;
    const numDependentsRaw = form.num_dependents.value;
    const numDependents    = numDependentsRaw !== '' ? parseInt(numDependentsRaw, 10) : null;
    const reason           = String(form.reason.value || '').trim();

    // ── Section 4: Bank Details ─────────────────────────────────────────────
    const bankName      = String(form.bank_name.value || '').trim();
    const branch        = String(form.branch.value || '').trim();
    const accountName   = String(form.account_name.value || '').trim();
    const accountNumber = String(form.account_number.value || '').trim();

    // ── Client-side validation ────────────────────────────────────────────────

    // Section 1
    if (!fullName) {
      showError('Please enter your full name as it appears on your NIC.');
      return;
    }
    if (!nic) {
      showError('Please enter your NIC number.');
      return;
    }
    if (!dob) {
      showError('Please select your date of birth.');
      return;
    }
    if (!gender) {
      showError('Please select your gender.');
      return;
    }
    if (!division) {
      showError('Please select a division.');
      return;
    }
    if (!gnDivision) {
      showError('Please select a GN division.');
      return;
    }
    if (!address) {
      showError('Please enter your permanent address.');
      return;
    }
    if (phoneNum && !/^[0-9+]{7,20}$/.test(phoneNum)) {
      showError('Please enter a valid phone number (7–20 digits).');
      return;
    }

    // House photo
    const housePhotoFiles = housePhotoInput?.files || [];
    if (housePhotoFiles.length === 0) {
      showError('Please upload at least one photo of your house (JPEG or PNG).');
      housePhotoLabel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (housePhotoFiles.length > 5) {
      showError('You can upload a maximum of 5 house photos.');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    for (let i = 0; i < housePhotoFiles.length; i++) {
      if (!allowedTypes.includes(housePhotoFiles[i].type)) {
        showError(`File "${housePhotoFiles[i].name}" must be a JPEG or PNG image.`);
        return;
      }
      if (housePhotoFiles[i].size > 5 * 1024 * 1024) {
        showError(`File "${housePhotoFiles[i].name}" must be smaller than 5 MB.`);
        return;
      }
    }

    // Section 2
    if (username.length < 3) {
      showError('Username must be at least 3 characters long.');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match. Please check and try again.');
      if (typeof gsap !== 'undefined') {
        gsap.to('#confirm_password', { x: [-8, 8, -6, 6, 0], duration: 0.4, ease: 'power2.inOut' });
      }
      return;
    }

    // Section 3
    if (monthlyIncome === null || isNaN(monthlyIncome)) {
      showError('Please enter your monthly household income (enter 0 if none).');
      return;
    }
    if (monthlyIncome < 0) {
      showError('Monthly income cannot be a negative value.');
      return;
    }
    if (numDependents === null || isNaN(numDependents)) {
      showError('Please enter the number of dependents (enter 0 if none).');
      return;
    }
    if (numDependents < 0 || numDependents > 20) {
      showError('Number of dependents must be between 0 and 20.');
      return;
    }
    if (!reason || reason.length < 10) {
      showError('Please describe your reason for applying (at least 10 characters).');
      return;
    }

    // Section 4
    if (!bankName || !branch || !accountName || !accountNumber) {
      showError('Please click "Add Bank Details" and provide your bank information before registering.');
      return;
    }
    if (!/^[0-9]+$/.test(accountNumber)) {
      showError('Account number must contain only digits.');
      return;
    }

    setLoading(true);

    try {
      // ── Build FormData payload (required for multipart/form-data file upload) ────
      // DO NOT set Content-Type manually — the browser sets it automatically
      // with the correct multipart boundary when using FormData.
      const formData = new FormData();

      // Personal info
      formData.append('Full_Name',  fullName);
      formData.append('NIC',        nic);
      formData.append('DOB',        dob);
      formData.append('Gender',     gender);
      if (phoneNum) formData.append('Phone_Num', phoneNum);
      formData.append('Division',   division);
      formData.append('GN_Division', gnDivision);
      formData.append('Address',    address);

      // Credentials
      formData.append('Username',   username);
      formData.append('Password',   password);

      // Application details
      formData.append('Monthly_Income', monthlyIncome);
      formData.append('Dependents',     numDependents);
      formData.append('Reason',         reason);

      // Bank Details
      formData.append('Bank_Name',      bankName);
      formData.append('Branch',         branch);
      formData.append('Account_Name',   accountName);
      formData.append('Account_Number', accountNumber);

      // House photo files
      for (let i = 0; i < housePhotoFiles.length; i++) {
        formData.append('housePhoto', housePhotoFiles[i]);
      }

      if (isOfficerMode && officerId) {
        formData.append('officer_id', officerId);
      }

      // ── POST to /api/auth/register ────────────────────────────────────────────
      // NOTE: No 'Content-Type' header — browser sets multipart/form-data
      //       with the correct boundary automatically when using FormData.
      const response = await fetch('/api/auth/register', {
        method:  'POST',
        body:    formData,
        // headers intentionally omitted — no Content-Type, no JSON
      });

      // Always try to parse JSON first
      let data;
      try {
        data = await response.json();
      } catch (_jsonErr) {
        // Non-JSON body (e.g. unexpected 500 HTML page)
        throw new Error(
          response.ok
            ? 'Unexpected response from the server. Please try again.'
            : 'A server error occurred. Please try again later.'
        );
      }

      // Only show success when the server explicitly returns status: 'success'
      if (!response.ok || data?.status !== 'success') {
        throw new Error(data?.message || 'Registration failed. Please try again.');
      }

      // ── Success path — response was 201 and status === 'success' ──────────
      if (isOfficerMode) {
        showSuccess('Applicant successfully registered!');
      } else {
        showSuccess('Registration complete! Your application has been submitted. Redirecting to login…');
      }
      
      form.reset();
      // Reset strength bar after form clear
      if (strengthBar) {
        strengthBar.className = 'password-strength-bar';
        strengthBar.style.width = '0%';
      }
      // Reset file input visual state
      housePhotoDT = new DataTransfer();
      renderPhotoList();

      // Redirect after the user can read the success message
      if (!isOfficerMode) {
        window.setTimeout(() => {
          window.location.href = 'login.html';
        }, 2800);
      }

    } catch (err) {
      // All error paths land here — success box stays hidden
      showError(err.message || 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
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

