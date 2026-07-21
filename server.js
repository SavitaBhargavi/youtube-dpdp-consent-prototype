const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// JSON database file configuration
const dbPath = path.join(__dirname, 'db.json');

let db = {
  users: [],
  consent_requests: [],
  citizens: [
    { aadhaar: '123456789012', name: 'Rakesh Rao', mobile: '+91 98765 43221', otp: null },
    { aadhaar: '987654321098', name: 'Sunita Sharma', mobile: '+91 98123 45678', otp: null },
    { aadhaar: '555566667777', name: 'Amit Kumar Patel', mobile: '+91 90000 11111', otp: null }
  ]
};

// Database persistence helpers
function loadDb() {
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(data);
      // Ensure seed citizens are present
      if (!db.citizens || db.citizens.length === 0) {
        db.citizens = [
          { aadhaar: '123456789012', name: 'Rakesh Rao', mobile: '+91 98765 43221', otp: null },
          { aadhaar: '987654321098', name: 'Sunita Sharma', mobile: '+91 98123 45678', otp: null },
          { aadhaar: '555566667777', name: 'Amit Kumar Patel', mobile: '+91 90000 11111', otp: null }
        ];
      }
      console.log('Database loaded successfully. Records count - Users:', db.users.length, 'Consent Requests:', db.consent_requests.length);
    } catch (e) {
      console.error('Error parsing db.json, starting with clean schema:', e);
      saveDb();
    }
  } else {
    saveDb();
    console.log('Initialized database file db.json');
  }
}

function saveDb() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write to db.json:', e);
  }
}

// Load DB on startup
loadDb();

// Utility: Calculate age from DOB
function calculateAge(dobString) {
  let birthDate;
  if (dobString.includes('/')) {
    const parts = dobString.split('/');
    const day = parseInt(parts[0].trim(), 10);
    const month = parseInt(parts[1].trim(), 10) - 1; // 0-indexed month
    const year = parseInt(parts[2].trim(), 10);
    birthDate = new Date(year, month, day);
  } else {
    birthDate = new Date(dobString);
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Endpoint: Register Teen
app.post('/api/register', (req, res) => {
  const { name, dob, mobile, parentEmail } = req.body;

  if (!name || !dob || !mobile) {
    return res.status(400).json({ error: 'Name, DOB, and mobile are required.' });
  }

  const age = calculateAge(dob);
  const isUnder18 = age < 18;
  const status = isUnder18 ? 'pending_consent' : 'active';

  const userId = db.users.length + 1;
  const newUser = { id: userId, name, dob, mobile, status };
  
  db.users.push(newUser);

  if (isUnder18) {
    if (!parentEmail) {
      return res.status(400).json({ error: 'Parent email is required for users under 18.' });
    }

    const requestId = 'req_' + Math.random().toString(36).substring(2, 8);
    const newRequest = {
      id: requestId,
      teen_id: userId,
      parent_email: parentEmail,
      status: 'pending',
      ad_personalisation: 0,
      watch_history: 0,
      comments_enabled: 1,
      created_at: new Date().toISOString()
    };

    db.consent_requests.push(newRequest);
    saveDb();

    res.status(201).json({
      requiresConsent: true,
      userId,
      requestId,
      status
    });
  } else {
    saveDb();
    res.status(201).json({
      requiresConsent: false,
      userId,
      status
    });
  }
});

// Endpoint: Get Consent Request Details
app.get('/api/consent/:requestId', (req, res) => {
  const { requestId } = req.params;
  const request = db.consent_requests.find(r => r.id === requestId);

  if (!request) {
    return res.status(404).json({ error: 'Consent request not found.' });
  }

  const teen = db.users.find(u => u.id === request.teen_id);
  const teenName = teen ? teen.name : 'Unknown Teen';
  const teenDob = teen ? teen.dob : '';

  res.json({
    ...request,
    teen_name: teenName,
    teen_dob: teenDob
  });
});

// Endpoint: Send Mock DigiLocker OTP
app.post('/api/consent/:requestId/send-otp', (req, res) => {
  const { aadhaar } = req.body;

  if (!aadhaar || aadhaar.length !== 12) {
    return res.status(400).json({ error: 'Please enter a valid 12-digit Aadhaar number.' });
  }

  const citizenIndex = db.citizens.findIndex(c => c.aadhaar === aadhaar);
  if (citizenIndex === -1) {
    return res.status(404).json({ 
      error: 'Aadhaar not found in Mock DigiLocker. Try using 123456789012, 987654321098, or 555566667777.' 
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  db.citizens[citizenIndex].otp = otp;
  saveDb();

  console.log(`[MOCK DigiLocker] OTP for Aadhaar ${aadhaar} (${db.citizens[citizenIndex].name}): ${otp}`);

  res.json({ 
    message: 'Mock OTP sent successfully to registered mobile.', 
    mockOtp: otp
  });
});

// Endpoint: Verify Mock DigiLocker OTP
app.post('/api/consent/:requestId/verify-otp', (req, res) => {
  const { requestId } = req.params;
  const { aadhaar, otp } = req.body;

  if (!aadhaar || !otp) {
    return res.status(400).json({ error: 'Aadhaar and OTP are required.' });
  }

  const citizen = db.citizens.find(c => c.aadhaar === aadhaar);
  if (!citizen) {
    return res.status(404).json({ error: 'Aadhaar profile not found.' });
  }

  if (citizen.otp !== otp) {
    return res.status(400).json({ error: 'Invalid verification OTP. Please try again.' });
  }

  const requestIndex = db.consent_requests.findIndex(r => r.id === requestId);
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Consent request not found.' });
  }

  db.consent_requests[requestIndex].status = 'verified';
  saveDb();

  res.json({ 
    message: 'DigiLocker Verification Successful!', 
    parentName: citizen.name 
  });
});

// Endpoint: Approve & Save Consent Settings
app.post('/api/consent/:requestId/approve', (req, res) => {
  const { requestId } = req.params;
  const { ad_personalisation, watch_history, comments_enabled } = req.body;

  const requestIndex = db.consent_requests.findIndex(r => r.id === requestId);
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Consent request not found.' });
  }

  const teenId = db.consent_requests[requestIndex].teen_id;
  const userIndex = db.users.findIndex(u => u.id === teenId);

  // Update consent settings
  db.consent_requests[requestIndex].status = 'approved';
  db.consent_requests[requestIndex].ad_personalisation = ad_personalisation ? 1 : 0;
  db.consent_requests[requestIndex].watch_history = watch_history ? 1 : 0;
  db.consent_requests[requestIndex].comments_enabled = comments_enabled ? 1 : 0;

  // Set teen user active
  if (userIndex !== -1) {
    db.users[userIndex].status = 'active';
  }

  saveDb();

  res.json({ message: 'Consent successfully saved and user account unlocked.' });
});

// Endpoint: Check Request Status
app.get('/api/consent/:requestId/status', (req, res) => {
  const { requestId } = req.params;
  const request = db.consent_requests.find(r => r.id === requestId);

  if (!request) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  res.json({ status: request.status });
});

// Endpoint: Get Live State (for right-side developer panel)
app.get('/api/debug/state', (req, res) => {
  // Return the last 5 records of users and requests for display, and all citizens
  res.json({
    users: db.users.slice(-5),
    consentRequests: db.consent_requests.slice(-5),
    citizens: db.citizens
  });
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 DPDP Backend Server running on port ${PORT}`);
  console.log(`   Pure JS File DB (db.json) active.`);
  console.log(`=================================================`);
});
