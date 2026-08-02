const fs = require('fs');
let html = fs.readFileSync('applicant_edit.html', 'utf8');

// Remove the Account Credentials section completely
const startIdx = html.indexOf('<div class="form-section">\n              <div class="form-section-header">\n                <span class="section-number">03</span>\n                <h3>Account Credentials</h3>');
if (startIdx !== -1) {
  const endIdx = html.indexOf('</form>', startIdx);
  if (endIdx !== -1) {
    html = html.substring(0, startIdx) + '\n' + html.substring(endIdx);
  }
}

// Remove the House Photo field
const photoStart = html.indexOf('<!-- House Photo Upload -->');
if (photoStart !== -1) {
  const photoEnd = html.indexOf('</div>', html.indexOf('id="housePhoto"', photoStart));
  if (photoEnd !== -1) {
    // find the end of the div
    const divEnd = html.indexOf('</div>', photoEnd + 6);
    html = html.substring(0, photoStart) + html.substring(divEnd + 6);
  }
}

// Remove the Officer registration stuff
const officerStart = html.indexOf('<!-- (Optional) Hidden or visual field for officer registration -->');
if (officerStart !== -1) {
  const officerEnd = html.indexOf('</div>', html.indexOf('id="registeringOfficer"', officerStart));
  html = html.substring(0, officerStart) + html.substring(officerEnd + 6);
}

fs.writeFileSync('applicant_edit.html', html);
