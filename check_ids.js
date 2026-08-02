const fs = require('fs');
const html = fs.readFileSync('applicant_edit.html', 'utf8');
const ids = ['full_name', 'nic', 'address', 'dob', 'gender', 'division', 'gnDivision', 'bank_name', 'branch', 'account_name', 'account_number', 'monthly_income', 'num_dependents', 'reason', 'open-bank-modal-btn', 'bank-status-msg'];
ids.forEach(id => {
  if (!html.includes('id="' + id + '"')) console.log('MISSING: ' + id);
});
console.log('Done checking.');
