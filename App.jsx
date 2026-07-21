import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Mail, Database, Terminal, CheckCircle2, AlertTriangle, 
  Smartphone, User, RefreshCw, Key, Settings, Play, ArrowRight, 
  Lock, MessageSquare, Clock, HelpCircle, Eye, EyeOff, Radio
} from 'lucide-react';

export default function App() {
  // Screens state
  const [activeScreen, setActiveScreen] = useState(1);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState('');
  
  // Forms state
  const [teenForm, setTeenForm] = useState({
    name: 'Ananya Rao',
    dob: '14/03/2012',
    mobile: '+91 98765 43221',
    parentEmail: 'rakesh.rao@email.com'
  });

  const [parentName, setParentName] = useState('');
  const [mockAadhaar, setMockAadhaar] = useState('123456789012');
  const [mockOtp, setMockOtp] = useState('');
  const [receivedMockOtp, setReceivedMockOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [aadhaarError, setAadhaarError] = useState('');

  // Toggles for parent consent
  const [consentSettings, setConsentSettings] = useState({
    ad_personalisation: false,
    watch_history: false,
    comments_enabled: true
  });

  // Simulator/Dashboard state
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [apiLogs, setApiLogs] = useState([]);
  const [dbState, setDbState] = useState({ users: [], consentRequests: [], citizens: [] });
  const [highlightedRow, setHighlightedRow] = useState({ table: '', id: null });

  const consoleEndRef = useRef(null);

  // Poll intervals
  const pollTimerRef = useRef(null);

  // Initialize and load initial DB state
  useEffect(() => {
    fetchDbState();
    addApiLog('SYSTEM', 'Simulator dashboard ready. Seeding details initialized.');
  }, []);

  // Scroll console logs to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [apiLogs]);

  // Fetch SQLite (db.json) state from backend
  const fetchDbState = async () => {
    try {
      const res = await fetch('/api/debug/state');
      if (res.ok) {
        const data = await res.json();
        setDbState(data);
      }
    } catch (e) {
      console.error('Error fetching DB state:', e);
    }
  };

  // Helper to log API calls into simulator CLI
  const addApiLog = (method, endpoint, status = '', details = '') => {
    const timestamp = new Date().toLocaleTimeString();
    setApiLogs(prev => [...prev, { timestamp, method, endpoint, status, details }]);
  };

  // Poll status endpoint while teen is waiting
  const startStatusPolling = (reqId) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    
    addApiLog('POLLING', `/api/consent/${reqId}/status`, 'START', 'Checking parent approval status every 3s...');
    
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/consent/${reqId}/status`);
        if (res.ok) {
          const data = await res.json();
          addApiLog('GET', `/api/consent/${reqId}/status`, res.status, `Status: ${data.status}`);
          
          if (data.status === 'approved') {
            clearInterval(pollTimerRef.current);
            addApiLog('SYSTEM', 'Parent approved request. Unlocking teen account.', 'ACTIVE');
            
            // Re-fetch request details to load correct settings
            const reqDetails = await fetch(`/api/consent/${reqId}`);
            if (reqDetails.ok) {
              const details = await reqDetails.json();
              setConsentSettings({
                ad_personalisation: details.ad_personalisation === 1,
                watch_history: details.watch_history === 1,
                comments_enabled: details.comments_enabled === 1
              });
            }
            
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              setActiveScreen(9); // Unlocked teen home feed
            }, 1200);
            fetchDbState();
          }
        }
      } catch (e) {
        console.error('Error during status poll:', e);
      }
    }, 3000);
  };

  // Stop polling on unmount or navigation change
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Screen 1 -> 2: Start Signup
  const handleStartSignup = () => {
    setActiveScreen(2);
  };

  // Screen 2 -> 3: Register Teen User
  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teenForm)
      });
      const data = await res.json();
      
      addApiLog('POST', '/api/register', res.status, `Created User. Under-18 detected = ${data.requiresConsent}`);
      
      if (res.ok) {
        // Highlight database changes
        setHighlightedRow({ table: 'users', id: data.userId });
        fetchDbState();

        if (data.requiresConsent) {
          setRequestId(data.requestId);
          // Advance to screen 3 (Verify age / show VPC notification)
          setTimeout(() => {
            setLoading(false);
            setActiveScreen(3);
          }, 600);
        } else {
          // Over-18 directly goes to screen 9 (activated dashboard)
          setTimeout(() => {
            setLoading(false);
            setActiveScreen(9);
          }, 600);
        }
      } else {
        alert(data.error || 'Failed to register.');
        setLoading(false);
      }
    } catch (e) {
      addApiLog('POST', '/api/register', 'FAILED', e.message);
      setLoading(false);
    }
  };

  // Screen 3 -> 4: Trigger Parent Email & Waiting State
  const handleSendConsentRequest = async () => {
    setLoading(true);
    
    // Simulate email receipt on dashboard right panel
    const parentConsentUrl = `${window.location.origin}/consent/${requestId}`;
    
    const newEmail = {
      id: Date.now(),
      sender: 'YouTube Parental Safety',
      subject: `[Action Required] Consent requested for Ananya's account`,
      body: `Hi Rakesh Rao,\n\nYour child, Ananya Rao, has created a YouTube account. Because she is under 18, Indian DPDP law requires a parent to verify their identity and grant parental consent before settings are unlocked.\n\nPlease click the secure link below to verify your identity via DigiLocker and customize her account features.`,
      url: parentConsentUrl,
      requestId: requestId,
      unread: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTimeout(() => {
      setEmails([newEmail, ...emails]);
      setSelectedEmail(newEmail);
      setHighlightedRow({ table: 'consent_requests', id: requestId });
      addApiLog('EMAIL', `Sent notification to ${teenForm.parentEmail}`, 'OK', `Link: ${parentConsentUrl}`);
      
      setLoading(false);
      setActiveScreen(4); // Waiting Screen
      startStatusPolling(requestId);
      fetchDbState();
    }, 800);
  };

  // Handle clicking parent link in email mock inbox
  const handleOpenParentLink = async (reqId) => {
    setLoading(true);
    if (pollTimerRef.current) {
      addApiLog('SYSTEM', 'Parent opened verification link. Teen screen keeps polling.');
    }
    
    try {
      const res = await fetch(`/api/consent/${reqId}`);
      addApiLog('GET', `/api/consent/${reqId}`, res.status, 'Loading verification portal details');
      
      if (res.ok) {
        const data = await res.json();
        // Load settings from current db record
        setConsentSettings({
          ad_personalisation: data.ad_personalisation === 1,
          watch_history: data.watch_history === 1,
          comments_enabled: data.comments_enabled === 1
        });
        
        // Mark email read
        setEmails(prev => prev.map(e => e.requestId === reqId ? { ...e, unread: false } : e));
        
        setTimeout(() => {
          setLoading(false);
          setActiveScreen(5); // Parent welcome/method screen
        }, 800);
      } else {
        alert('Invalid or expired link.');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Screen 5 -> 6: Select KYC method, go to DigiLocker screen
  const handleSelectDigiLocker = () => {
    setActiveScreen(6);
  };

  // Screen 6: Send DigiLocker OTP
  const handleSendOtp = async () => {
    setAadhaarError('');
    setOtpError('');
    if (mockAadhaar.length !== 12 || !/^\d+$/.test(mockAadhaar)) {
      setAadhaarError('Aadhaar must be a 12-digit numeric code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/consent/${requestId}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar: mockAadhaar })
      });
      const data = await res.json();
      
      addApiLog('POST', `/api/consent/${requestId}/send-otp`, res.status, data.error ? `Error: ${data.error}` : `OTP sent.`);
      
      if (res.ok) {
        setReceivedMockOtp(data.mockOtp);
        addApiLog('MOCK SMS', `SMS to mobile: Your verification OTP is ${data.mockOtp}`, 'SMS_DELIVERED');
        setLoading(false);
      } else {
        setAadhaarError(data.error);
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Screen 6: Verify OTP -> Screen 7: Consent Form
  const handleVerifyOtp = async () => {
    setOtpError('');
    if (!mockOtp) {
      setOtpError('OTP is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/consent/${requestId}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar: mockAadhaar, otp: mockOtp })
      });
      const data = await res.json();
      
      addApiLog('POST', `/api/consent/${requestId}/verify-otp`, res.status, data.error ? `Error: ${data.error}` : `Verified identity: ${data.parentName}`);
      
      if (res.ok) {
        setParentName(data.parentName);
        setHighlightedRow({ table: 'consent_requests', id: requestId });
        fetchDbState();
        setTimeout(() => {
          setLoading(false);
          setActiveScreen(7); // Consent Config Screen
        }, 1000);
      } else {
        setOtpError(data.error);
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Screen 7 -> 8: Submit Consent Settings
  const handleGrantConsent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consent/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consentSettings)
      });
      const data = await res.json();
      
      addApiLog('POST', `/api/consent/${requestId}/approve`, res.status, 'Settings updated. Account activated.');
      
      if (res.ok) {
        setHighlightedRow({ table: 'consent_requests', id: requestId });
        fetchDbState();
        setTimeout(() => {
          setLoading(false);
          setActiveScreen(8); // Parent Success Screen
        }, 800);
      } else {
        alert(data.error || 'Failed to approve consent.');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Screen 8 -> 9: Simulated "Switch Back to Teen"
  // If polling was active, this happens automatically on teen side. 
  // For single phone emulator demonstration, parent manually transitions.
  const handleSwitchToTeen = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setActiveScreen(9);
  };

  // Reset Demo
  const handleResetDemo = async () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setLoading(true);
    setRequestId('');
    setParentName('');
    setMockOtp('');
    setReceivedMockOtp('');
    setAadhaarError('');
    setOtpError('');
    setConsentSettings({
      ad_personalisation: false,
      watch_history: false,
      comments_enabled: true
    });
    
    addApiLog('SYSTEM', 'Resetting demonstration state...');
    
    // Clear lists
    setEmails([]);
    setSelectedEmail(null);
    
    try {
      // Overwrite db.json to clear logs in backend
      const wipeRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'RESET', dob: '01/01/2000', mobile: '0' })
      });
      // We don't save RESET, but let's just trigger loadDb or let db stay as is
      // Actually, let's keep database rows but just reset current emulator UI.
      fetchDbState();
    } catch (e) {
      console.error(e);
    }
    
    setTimeout(() => {
      setLoading(false);
      setActiveScreen(1);
      addApiLog('SYSTEM', 'State reset complete. Ready.');
    }, 600);
  };

  return (
    <div className="app-layout">
      {/* Header bar */}
      <header className="app-header">
        <div>
          <h1>
            <Play className="play-icon" style={{ fill: 'var(--yt-red)', color: 'var(--yt-red)', width: 28, height: 28 }} />
            YouTube Consent Portal
          </h1>
          <p>India Digital Personal Data Protection (DPDP) Act Compliance Prototype</p>
        </div>
        <span className="badge-tag">DPDP VPC Flow</span>
      </header>

      {/* LEFT: Phone Emulator */}
      <section className="emulator-column">
        <div className="phone-frame">
          <div className="phone-notch"></div>
          
          <div className="phone-inner">
            {/* Virtual Status Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 20px', fontSize: 10, color: '#aaa', fontWeight: 600, background: '#000' }}>
              <span>13:52</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Radio size={10} style={{ color: 'var(--teal)' }} />
                <span>5G</span>
                <span style={{ width: 14, height: 8, border: '1px solid #aaa', borderRadius: 2, display: 'inline-block', position: 'relative' }}>
                  <span style={{ width: '80%', height: '100%', background: '#aaa', display: 'block' }}></span>
                </span>
              </div>
            </div>

            {/* Simulated Phone Screen */}
            {loading ? (
              <div className="loading-container">
                <div className="spinner-circle"></div>
                <p style={{ color: 'var(--yt-text-dim)', fontSize: 13 }}>Processing Request...</p>
              </div>
            ) : (
              <>
                {/* ROLE BADGES FOR CLEAR CONTEXT */}
                {activeScreen >= 2 && activeScreen <= 4 && (
                  <span className="role-badge teen">Teen View</span>
                )}
                {activeScreen >= 5 && activeScreen <= 8 && (
                  <span className="role-badge parent">Parent View</span>
                )}
                {activeScreen === 9 && (
                  <span className="role-badge teen">Teen Unlocked</span>
                )}

                {/* SCREEN 1: Home View / Not Signed In */}
                {activeScreen === 1 && (
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="phone-logo">
                        <Play size={18} />
                        <span>YouTube</span>
                      </div>
                    </div>
                    <div className="phone-content" style={{ justifyContent: 'center' }}>
                      <div className="info-card" style={{ textAlign: 'center', padding: '20px 14px' }}>
                        <Lock size={32} style={{ color: 'var(--yt-red)', margin: '0 auto 12px' }} />
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Sign in to YouTube</h3>
                        <p style={{ fontSize: 12, color: 'var(--yt-text-dim)', lineHeight: 1.5 }}>
                          Save watch history, comment, and access premium video recommendations.
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.25 }}>
                        <div style={{ height: 110, background: 'var(--yt-surface)', borderRadius: 8 }}></div>
                        <div style={{ height: 12, width: '70%', background: 'var(--yt-surface)', borderRadius: 2 }}></div>
                        <div style={{ height: 8, width: '40%', background: 'var(--yt-surface)', borderRadius: 2 }}></div>
                      </div>
                    </div>
                    <div className="phone-footer">
                      <button className="btn btn-primary" onClick={handleStartSignup}>
                        Sign In / Create Account
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 2: Registration Form */}
                {activeScreen === 2 && (
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="phone-logo"><span>Create Account</span></div>
                    </div>
                    <div className="phone-content">
                      <p className="phone-subtitle">Enter your details to register a new YouTube handle.</p>
                      
                      <div className="form-group">
                        <label>Full Name</label>
                        <input 
                          type="text" 
                          value={teenForm.name} 
                          onChange={(e) => setTeenForm({...teenForm, name: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input 
                          type="text" 
                          placeholder="DD/MM/YYYY" 
                          value={teenForm.dob} 
                          onChange={(e) => setTeenForm({...teenForm, dob: e.target.value})}
                        />
                        <span style={{ fontSize: 10, color: 'var(--yt-text-dim)', marginTop: 4, display: 'block' }}>
                          Under 18 triggers parental consent flow (DPDP Act)
                        </span>
                      </div>
                      <div className="form-group">
                        <label>Mobile Number</label>
                        <input 
                          type="text" 
                          value={teenForm.mobile} 
                          onChange={(e) => setTeenForm({...teenForm, mobile: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="phone-footer">
                      <button className="btn btn-primary" onClick={handleRegister}>
                        Continue <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 3: Under-18 Alert */}
                {activeScreen === 3 && (
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="phone-logo">
                        <Shield size={16} style={{ color: 'var(--teal)' }} />
                        <span>Age Consent Check</span>
                      </div>
                    </div>
                    <div className="phone-content" style={{ justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center', marginTop: 12 }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(254, 228, 64, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <Shield size={28} style={{ color: 'var(--amber)' }} />
                        </div>
                        <h3 className="phone-title" style={{ fontSize: 16 }}>Parental Consent Required</h3>
                        <p style={{ fontSize: 12, color: 'var(--yt-text-dim)', lineHeight: 1.5, margin: '8px 0 16px' }}>
                          Under India's DPDP Act, because you are under 18, we need a verified parent or guardian to grant consent before we set up your profile.
                        </p>
                      </div>

                      <div className="form-group">
                        <label>Parent / Guardian's Email Address</label>
                        <input 
                          type="email" 
                          value={teenForm.parentEmail}
                          onChange={(e) => setTeenForm({...teenForm, parentEmail: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="phone-footer">
                      <button className="btn btn-primary" onClick={handleSendConsentRequest}>
                        Send Consent Request
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 4: Teen Waiting Screen */}
                {activeScreen === 4 && (
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="phone-logo"><span>Awaiting Consent</span></div>
                    </div>
                    <div className="phone-content" style={{ justifyContent: 'center', textAlign: 'center' }}>
                      <div style={{ margin: '0 auto 20px', width: 44, height: 44, borderRadius: '50%', background: 'rgba(254, 228, 64, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={22} className="spin-slow" style={{ color: 'var(--amber)' }} />
                      </div>
                      <h3 className="phone-title">Check your parent's inbox</h3>
                      <p style={{ fontSize: 12, color: 'var(--yt-text-dim)', lineHeight: 1.5, marginBottom: 16 }}>
                        We sent a secure link to <strong>{teenForm.parentEmail}</strong>. 
                        This screen will automatically unlock once they verify.
                      </p>

                      <div className="info-card" style={{ width: '100%' }}>
                        <div className="info-row">
                          <span className="label">Status</span>
                          <span className="value" style={{ color: 'var(--amber)', fontWeight: 'bold' }}>Awaiting Parent</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Request ID</span>
                          <span className="value">{requestId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="phone-footer">
                      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--yt-text-dim)' }}>
                        👉 Check the <strong>Mock Email Inbox</strong> on the right to proceed as the parent!
                      </div>
                    </div>
                  </div>
                )}

                {/* SCREEN 5: Parent Home View */}
                {activeScreen === 5 && (
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="phone-logo">
                        <Play size={16} />
                        <span>Parent Gateway</span>
                      </div>
                    </div>
                    <div className="phone-content">
                      <div style={{ textAlign: 'center', margin: '10px 0 20px' }}>
                        <User size={36} style={{ color: 'var(--teal)', margin: '0 auto 10px' }} />
                        <h3 className="phone-title">{teenForm.name} wants to join YouTube</h3>
                        <p style={{ fontSize: 12, color: 'var(--yt-text-dim)', lineHeight: 1.5 }}>
                          Under the DPDP Act 2023, parents must verify their identity to grant consent for children.
                        </p>
                      </div>

                      <div className="form-group">
                        <label>Choose Verification Method</label>
                        <select defaultValue="digilocker">
                          <option value="digilocker">DigiLocker Integration (Recommended)</option>
                          <option value="videokyc">Video KYC Interview (Manual)</option>
                        </select>
                      </div>

                      <div className="info-card">
                        <p style={{ fontSize: 11, color: 'var(--yt-text-dim)', lineHeight: 1.4 }}>
                          ⚡ <strong>DigiLocker</strong> checks your verified Aadhaar credential in seconds. No document uploads required.
                        </p>
                      </div>
                    </div>
                    <div className="phone-footer">
                      <button className="btn btn-teal" onClick={handleSelectDigiLocker}>
                        Verify with DigiLocker
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 6: DigiLocker Verification Simulation */}
                {activeScreen === 6 && (
                  <div className="phone-screen" style={{ background: '#0a192f' }}>
                    <div className="phone-header" style={{ background: '#0a192f', borderBottom: '1px solid #172a45' }}>
                      <span style={{ fontSize: 13, fontWeight: 'bold', color: '#64ffda' }}>DigiLocker Sandbox</span>
                    </div>
                    <div className="phone-content">
                      <p className="phone-subtitle" style={{ color: '#8892b0' }}>
                        Enter Aadhaar credentials to confirm parent/guardian relationship.
                      </p>

                      <div className="form-group">
                        <label style={{ color: '#64ffda' }}>Aadhaar Card Number (12 Digits)</label>
                        <input 
                          type="text" 
                          maxLength="12"
                          style={{ background: '#172a45', borderColor: '#303030' }}
                          value={mockAadhaar}
                          onChange={(e) => setMockAadhaar(e.target.value)}
                        />
                        {aadhaarError && <span style={{ fontSize: 11, color: '#ff6b6b', marginTop: 4, display: 'block' }}>{aadhaarError}</span>}
                      </div>

                      <button className="btn btn-ghost" style={{ border: '1px solid #64ffda', color: '#64ffda', marginBottom: 16 }} onClick={handleSendOtp}>
                        Generate OTP
                      </button>

                      {receivedMockOtp && (
                        <div className="form-group" style={{ animation: 'slideDown 0.3s ease' }}>
                          <label style={{ color: '#64ffda' }}>Enter 6-Digit SMS OTP</label>
                          <input 
                            type="text" 
                            maxLength="6"
                            placeholder="Type OTP"
                            style={{ background: '#172a45', borderColor: '#64ffda' }}
                            value={mockOtp}
                            onChange={(e) => setMockOtp(e.target.value)}
                          />
                          {otpError && <span style={{ fontSize: 11, color: '#ff6b6b', marginTop: 4, display: 'block' }}>{otpError}</span>}
                          
                          <span style={{ fontSize: 11, color: 'var(--amber)', background: 'rgba(254,228,64,0.08)', padding: '6px 10px', borderRadius: 4, marginTop: 10, display: 'block', border: '1px dashed rgba(254,228,64,0.2)' }}>
                            🔑 Mock SMS received: <strong>{receivedMockOtp}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="phone-footer" style={{ background: '#0a192f', borderTop: '1px solid #172a45' }}>
                      <button 
                        className="btn btn-teal" 
                        disabled={!receivedMockOtp} 
                        style={{ background: receivedMockOtp ? '#64ffda' : '#334155', color: '#0a192f' }}
                        onClick={handleVerifyOtp}
                      >
                        Verify & Link
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 7: Consent Form Settings */}
                {activeScreen === 7 && (
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="phone-logo">
                        <Settings size={16} />
                        <span>Data Consent Dashboard</span>
                      </div>
                    </div>
                    <div className="phone-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <CheckCircle2 size={16} style={{ color: 'var(--teal)' }} />
                        <span style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>Parent Identity Verified</span>
                      </div>
                      
                      <h3 className="phone-title" style={{ fontSize: 15 }}>Configure Ananya's Privacy</h3>
                      <p className="phone-subtitle" style={{ marginBottom: 12 }}>
                        Select the features you authorize. Unselected settings default to "OFF" under DPDP law.
                      </p>

                      <div className="info-card" style={{ padding: '4px 12px' }}>
                        {/* Personalisation Toggle */}
                        <div className="toggle-setting">
                          <div className="toggle-details">
                            <span className="toggle-title">Ad Personalization</span>
                            <p className="toggle-desc">Show targeted ads based on search preferences (starts OFF by default).</p>
                          </div>
                          <div 
                            className={`switch-control ${consentSettings.ad_personalisation ? 'active' : ''}`}
                            onClick={() => setConsentSettings({...consentSettings, ad_personalisation: !consentSettings.ad_personalisation})}
                          >
                            <div className="switch-knob"></div>
                          </div>
                        </div>

                        {/* Watch History Toggle */}
                        <div className="toggle-setting">
                          <div className="toggle-details">
                            <span className="toggle-title">Watch History Profiling</span>
                            <p className="toggle-desc">Track and compile recommendation profiles (starts OFF by default).</p>
                          </div>
                          <div 
                            className={`switch-control ${consentSettings.watch_history ? 'active' : ''}`}
                            onClick={() => setConsentSettings({...consentSettings, watch_history: !consentSettings.watch_history})}
                          >
                            <div className="switch-knob"></div>
                          </div>
                        </div>

                        {/* Comments Toggle */}
                        <div className="toggle-setting">
                          <div className="toggle-details">
                            <span className="toggle-title">Public Comments</span>
                            <p className="toggle-desc">Allow child to post comments on public YouTube uploads.</p>
                          </div>
                          <div 
                            className={`switch-control ${consentSettings.comments_enabled ? 'active' : ''}`}
                            onClick={() => setConsentSettings({...consentSettings, comments_enabled: !consentSettings.comments_enabled})}
                          >
                            <div className="switch-knob"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="phone-footer">
                      <button className="btn btn-primary" onClick={handleGrantConsent}>
                        Grant Consent & Unlock
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 8: Parent Success Screen */}
                {activeScreen === 8 && (
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="phone-logo"><span>Setup Complete</span></div>
                    </div>
                    <div className="phone-content" style={{ justifyContent: 'center', textAlign: 'center' }}>
                      <div style={{ margin: '0 auto 16px', width: 50, height: 50, borderRadius: '50%', background: 'rgba(0, 245, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={28} style={{ color: 'var(--teal)' }} />
                      </div>
                      <h3 className="phone-title">Consent Logged!</h3>
                      <p style={{ fontSize: 12, color: 'var(--yt-text-dim)', lineHeight: 1.5, marginBottom: 20 }}>
                        Ananya Rao's profile has been activated with your selected compliance configuration.
                      </p>

                      <div className="info-card" style={{ width: '100%' }}>
                        <div className="info-row"><span className="label">Ads Profile</span><span className="value">{consentSettings.ad_personalisation ? 'ON (Targeted)' : 'OFF (Generic)'}</span></div>
                        <div className="info-row"><span className="label">Watch History</span><span className="value">{consentSettings.watch_history ? 'ON (Personalized)' : 'OFF (Neutral)'}</span></div>
                        <div className="info-row"><span className="label">Public Comments</span><span className="value">{consentSettings.comments_enabled ? 'ENABLED' : 'DISABLED'}</span></div>
                      </div>
                    </div>
                    <div className="phone-footer">
                      <button className="btn btn-teal" onClick={handleSwitchToTeen}>
                        Switch back to Teen Feed →
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 9: Teen Active Feed (UNLOCKED!) */}
                {activeScreen === 9 && (
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="phone-logo">
                        <Play size={18} />
                        <span>YouTube Unlocked</span>
                      </div>
                    </div>
                    <div className="phone-content" style={{ padding: 12 }}>
                      {/* Personalised Ad Block depending on Parent Consent */}
                      {consentSettings.ad_personalisation ? (
                        <div style={{ background: 'rgba(0, 245, 212, 0.1)', border: '1px solid rgba(0, 245, 212, 0.25)', borderRadius: 8, padding: 8, fontSize: 11, marginBottom: 12 }}>
                          <span style={{ background: 'var(--teal)', color: '#000', fontSize: 9, fontWeight: 'bold', padding: '1px 3px', borderRadius: 2, marginRight: 6 }}>AD</span>
                          <strong>Premium Coding Camp</strong>: Hey {teenForm.name.split(' ')[0]}, get 20% off React bootcamps!
                        </div>
                      ) : (
                        <div style={{ background: '#1c1c1c', border: '1px solid var(--yt-border)', borderRadius: 8, padding: 8, fontSize: 11, marginBottom: 12 }}>
                          <span style={{ background: '#555', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '1px 3px', borderRadius: 2, marginRight: 6 }}>SPONSORED</span>
                          <strong>National Water Day</strong>: Save water, secure our future. A public notice.
                        </div>
                      )}

                      <h4 style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 10 }}>
                        {consentSettings.watch_history ? '📚 Tailored for you (Profiling ON)' : '🔥 Trending videos (Profiling OFF)'}
                      </h4>

                      <div className="mock-feed">
                        {consentSettings.watch_history ? (
                          // Personalised/Educational Feeds
                          <>
                            <div className="mock-video-card">
                              <div className="mock-video-thumbnail">
                                <Play size={24} />
                                <span className="mock-video-duration">14:02</span>
                              </div>
                              <div className="mock-video-details">
                                <div className="mock-channel-avatar">CS</div>
                                <div className="mock-video-text">
                                  <span className="mock-video-title">Learn React Hooks in 15 Minutes</span>
                                  <span className="mock-video-meta">CodeSchool • 12K views • 2 hrs ago</span>
                                </div>
                              </div>
                            </div>
                            <div className="mock-video-card">
                              <div className="mock-video-thumbnail">
                                <Play size={24} />
                                <span className="mock-video-duration">22:15</span>
                              </div>
                              <div className="mock-video-details">
                                <div className="mock-channel-avatar">IS</div>
                                <div className="mock-video-text">
                                  <span className="mock-video-title">Physics Olympiad Prep: Optics Guide</span>
                                  <span className="mock-video-meta">IndiaScience • 5K views • 1 day ago</span>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          // General Public Feeds
                          <>
                            <div className="mock-video-card">
                              <div className="mock-video-thumbnail">
                                <Play size={24} />
                                <span className="mock-video-duration">10:50</span>
                              </div>
                              <div className="mock-video-details">
                                <div className="mock-channel-avatar">IS</div>
                                <div className="mock-video-text">
                                  <span className="mock-video-title">ISRO Chandrayaan Mission Launch Updates</span>
                                  <span className="mock-video-meta">ISRO Space • 1.2M views • 1 week ago</span>
                                </div>
                              </div>
                            </div>
                            <div className="mock-video-card">
                              <div className="mock-video-thumbnail">
                                <Play size={24} />
                                <span className="mock-video-duration">35:40</span>
                              </div>
                              <div className="mock-video-details">
                                <div className="mock-channel-avatar">NG</div>
                                <div className="mock-video-text">
                                  <span className="mock-video-title">Taj Mahal: Ancient Architectural Marvels</span>
                                  <span className="mock-video-meta">NatGeo India • 420K views • 3 days ago</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Public Comments Section dependent on Parent Consent */}
                        <div style={{ borderTop: '1px solid var(--yt-border)', paddingTop: 12, marginTop: 8 }}>
                          <h5 style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>Comments</h5>
                          {consentSettings.comments_enabled ? (
                            <div>
                              <input 
                                type="text" 
                                placeholder="Add a public comment..." 
                                style={{ background: '#121212', border: '1px solid var(--yt-border)', color: '#fff', padding: '6px 10px', fontSize: 11, borderRadius: 4, width: '100%' }}
                              />
                            </div>
                          ) : (
                            <p style={{ fontSize: 11, color: 'var(--yt-text-dim)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: 6, borderRadius: 4 }}>
                              🔒 Comments have been disabled for this profile by your parent.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="phone-footer">
                      <button className="btn btn-ghost" onClick={handleResetDemo}>
                        Restart Simulation
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stepper Dots */}
        <div className="stepper-container">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => (
            <div 
              key={dot} 
              className={`stepper-dot ${
                activeScreen === dot ? 'active' : 
                (activeScreen > dot && dot < 9) || (activeScreen === 9 && dot < 9) ? 'done' : ''
              }`}
            ></div>
          ))}
        </div>
      </section>

      {/* RIGHT: Developer Console, DB Tables, Mock Inbox */}
      <section className="dashboard-column">
        {/* SIMULATED EMAIL CLIENT */}
        <div className="glass-panel">
          <h2 className="panel-title">
            <Mail size={16} />
            Parent's Notification Inbox
          </h2>
          <div className="email-client">
            {emails.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--yt-text-dim)', fontStyle: 'italic' }}>
                Awaiting outgoing emails. Register as a teen in the phone simulator to send consent notifications here.
              </p>
            ) : (
              <div className="email-list">
                {emails.map((email) => (
                  <div key={email.id} className="email-client">
                    <div className={`email-card ${email.unread ? 'unread' : ''}`} onClick={() => setSelectedEmail(email)}>
                      <div className="email-card-header">
                        <span className="email-card-sender">{email.sender}</span>
                        <span>{email.time}</span>
                      </div>
                      <div className="email-card-subject">{email.subject}</div>
                      <div className="email-card-preview">{email.body}</div>
                    </div>
                    
                    {selectedEmail && selectedEmail.id === email.id && (
                      <div className="email-detail">
                        <div className="email-detail-header">
                          <div className="email-detail-subject">{selectedEmail.subject}</div>
                          <div>From: <strong>{selectedEmail.sender}</strong></div>
                          <div>To: <strong>{teenForm.parentEmail}</strong></div>
                        </div>
                        <div className="email-detail-body">
                          <p style={{ whiteSpace: 'pre-line' }}>{selectedEmail.body}</p>
                          
                          <button 
                            className="email-link-btn"
                            onClick={() => handleOpenParentLink(selectedEmail.requestId)}
                          >
                            <Smartphone size={14} /> Open Parent Consent Portal on Phone
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SQLITE / JSON DATABASE STATE */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
            <h2 className="panel-title" style={{ margin: 0, border: 'none', padding: 0 }}>
              <Database size={16} />
              SQLite Database Inspector (db.json)
            </h2>
            <button 
              onClick={fetchDbState} 
              style={{ background: 'transparent', border: 'none', color: 'var(--teal)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
            >
              <RefreshCw size={12} /> Sync Tables
            </button>
          </div>

          <div className="db-inspector">
            {/* USERS TABLE */}
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)', marginBottom: 6 }}>Table: users</h3>
              <div className="db-table-wrapper">
                {dbState.users.length === 0 ? (
                  <p style={{ fontSize: 10, color: 'var(--yt-text-dim)', padding: '4px 0' }}>No rows in users table.</p>
                ) : (
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>id</th>
                        <th>name</th>
                        <th>dob</th>
                        <th>mobile</th>
                        <th>status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbState.users.map((row) => (
                        <tr 
                          key={row.id} 
                          className={highlightedRow.table === 'users' && highlightedRow.id === row.id ? 'highlight-row' : ''}
                        >
                          <td>{row.id}</td>
                          <td style={{ fontWeight: 600 }}>{row.name}</td>
                          <td>{row.dob}</td>
                          <td>{row.mobile}</td>
                          <td>
                            <span className={`db-badge ${row.status}`}>{row.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* CONSENT REQUESTS TABLE */}
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)', marginBottom: 6 }}>Table: consent_requests</h3>
              <div className="db-table-wrapper">
                {dbState.consentRequests.length === 0 ? (
                  <p style={{ fontSize: 10, color: 'var(--yt-text-dim)', padding: '4px 0' }}>No rows in consent_requests table.</p>
                ) : (
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>id</th>
                        <th>teen_id</th>
                        <th>parent_email</th>
                        <th>status</th>
                        <th>ads</th>
                        <th>history</th>
                        <th>comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbState.consentRequests.map((row) => (
                        <tr 
                          key={row.id}
                          className={highlightedRow.table === 'consent_requests' && highlightedRow.id === row.id ? 'highlight-row' : ''}
                        >
                          <td style={{ color: 'var(--teal)', fontWeight: 600 }}>{row.id}</td>
                          <td>{row.teen_id}</td>
                          <td>{row.parent_email}</td>
                          <td>
                            <span className={`db-badge ${row.status}`}>{row.status}</span>
                          </td>
                          <td>{row.ad_personalisation === 1 ? 'ON' : 'OFF'}</td>
                          <td>{row.watch_history === 1 ? 'ON' : 'OFF'}</td>
                          <td>{row.comments_enabled === 1 ? 'ON' : 'OFF'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* API CALL CONSOLE */}
        <div className="glass-panel">
          <h2 className="panel-title">
            <Terminal size={16} />
            HTTP Request & API Logger
          </h2>
          <div className="console-logger">
            {apiLogs.length === 0 ? (
              <div className="console-line"><span className="timestamp">[SYSTEM]</span> Console logging initialized. Awaiting HTTP payloads...</div>
            ) : (
              apiLogs.map((log, index) => (
                <div key={index} className="console-line">
                  <span className="timestamp">[{log.timestamp}]</span>
                  <span className={`method ${log.method}`}>{log.method}</span>{' '}
                  <span style={{ color: '#fff' }}>{log.endpoint}</span>{' '}
                  {log.status && (
                    <span className={`status-${log.status.toString().startsWith('2') ? '200' : '400'}`}>
                      - {log.status}
                    </span>
                  )}
                  {log.details && <span style={{ color: '#888', marginLeft: 8 }}>({log.details})</span>}
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>

        {/* COMPLIANCE INFORMATION */}
        <div className="info-alert">
          <AlertTriangle size={18} />
          <div>
            <strong>DPDP Act Compliance Notes:</strong>
            <ul style={{ paddingLeft: 16, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <li><strong>Section 9(1):</strong> Mandatory verifiable parental consent (VPC) for processing children's data. DigiLocker links parents' authenticated profiles.</li>
              <li><strong>Section 9(2):</strong> Absolute prohibition of tracking, profiling, and behavioral advertising targetted at minors. Hence, personalization defaults strictly to "OFF".</li>
            </ul>
          </div>
        </div>

        {/* RESET CONTROL */}
        <div className="reset-bar">
          <button className="btn btn-ghost" style={{ width: 'auto', padding: '6px 16px', fontSize: 12, borderRadius: 8 }} onClick={handleResetDemo}>
            Reset Full Simulation
          </button>
        </div>
      </section>
    </div>
  );
}
