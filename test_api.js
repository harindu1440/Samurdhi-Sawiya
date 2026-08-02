const http = require('http');

async function testApi() {
  // Login as Minister
  const loginRes = await fetch('http://localhost:2008/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ User_ID: 'minister_admin', Password: 'password123', Role: 'Minister' }) // guessing credentials
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status);
    return;
  }
  const loginData = await loginRes.json();
  const token = loginData.token;

  // Hit Report API
  const reportRes = await fetch('http://localhost:2008/api/admin/reports?start_date=2026-08-01&end_date=2026-08-03', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const reportData = await reportRes.json();
  console.log('Report API response:', JSON.stringify(reportData, null, 2));
}

testApi().catch(console.error);
