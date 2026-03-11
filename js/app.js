/* ============================================
   KU Alumni Seminar — App Logic
   ============================================ */

// ---- CONFIG ----
// Google Apps Script Web App URL을 여기에 입력하세요
const API_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';

// ---- DOM Elements ----
const regForm = document.getElementById('regForm');
const successPanel = document.getElementById('successPanel');
const successTitle = document.getElementById('successTitle');
const lookupPanel = document.getElementById('lookupPanel');
const lookupMessage = document.getElementById('lookupMessage');
const btnSubmit = document.getElementById('btnSubmit');
const btnLookup = document.getElementById('btnLookup');
const btnAnother = document.getElementById('btnAnother');
const modeBtns = document.querySelectorAll('.mode-btn');

// Form fields
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const generationInput = document.getElementById('generation');
const affiliationInput = document.getElementById('affiliation');
const lookupPhoneInput = document.getElementById('lookupPhone');

let isEditMode = false;

// ---- Phone Number Formatting ----
function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return digits.slice(0, 3) + '-' + digits.slice(3);
  return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7);
}

function handlePhoneInput(e) {
  const pos = e.target.selectionStart;
  const before = e.target.value;
  e.target.value = formatPhone(e.target.value);
  // Adjust cursor position after formatting
  const diff = e.target.value.length - before.length;
  e.target.setSelectionRange(pos + diff, pos + diff);
}

phoneInput.addEventListener('input', handlePhoneInput);
lookupPhoneInput.addEventListener('input', handlePhoneInput);

// ---- Mode Toggle ----
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const mode = btn.dataset.mode;
    if (mode === 'lookup') {
      lookupPanel.style.display = 'block';
      lookupPanel.style.animation = 'fadeUp 0.4s ease-out';
    } else {
      lookupPanel.style.display = 'none';
      resetForm();
    }
  });
});

// ---- Lookup ----
btnLookup.addEventListener('click', async () => {
  const phone = lookupPhoneInput.value.trim();
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    showLookupMessage('전화번호를 정확히 입력해주세요.', 'error');
    return;
  }

  showLookupMessage('조회 중...', 'loading');
  btnLookup.disabled = true;

  try {
    const res = await fetch(`${API_URL}?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();

    if (data.found) {
      nameInput.value = data.name || '';
      phoneInput.value = data.phone || '';
      generationInput.value = data.generation || '';
      affiliationInput.value = data.affiliation || '';

      // Set dinner radio
      const dinnerRadios = document.querySelectorAll('input[name="dinner"]');
      dinnerRadios.forEach(r => {
        r.checked = r.value === data.dinner;
      });

      isEditMode = true;
      btnSubmit.querySelector('.btn-text').textContent = '수정 완료';
      showLookupMessage('기존 정보를 불러왔습니다. 수정 후 제출해주세요.', 'success');

      // Scroll to form
      regForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      showLookupMessage('등록된 정보가 없습니다. 새로 신청해주세요.', 'error');
    }
  } catch (err) {
    showLookupMessage('조회 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
  } finally {
    btnLookup.disabled = false;
  }
});

function showLookupMessage(msg, type) {
  lookupMessage.textContent = msg;
  lookupMessage.className = 'lookup-message ' + type;
}

// ---- Form Submission ----
regForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate
  if (!validateForm()) return;

  // Collect data
  const dinner = document.querySelector('input[name="dinner"]:checked');
  const formData = {
    action: isEditMode ? 'update' : 'register',
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    generation: generationInput.value.trim(),
    affiliation: affiliationInput.value,
    dinner: dinner ? dinner.value : '',
  };

  // Show loading
  setSubmitLoading(true);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(formData),
    });

    const result = await res.json();

    if (result.success) {
      successTitle.textContent = isEditMode
        ? '수정이 완료되었습니다!'
        : '신청이 완료되었습니다!';
      regForm.style.display = 'none';
      lookupPanel.style.display = 'none';
      document.querySelector('.form-mode-toggle').style.display = 'none';
      successPanel.style.display = 'block';
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (result.duplicate) {
      showFieldError(phoneInput, '이미 등록된 번호입니다. 상단에서 조회 후 수정해주세요.');
    } else {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    }
  } catch (err) {
    alert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    setSubmitLoading(false);
  }
});

// ---- Validation ----
function validateForm() {
  let valid = true;

  clearErrors();

  if (!nameInput.value.trim()) {
    showFieldError(nameInput, '이름을 입력해주세요.');
    valid = false;
  }

  const phoneDigits = phoneInput.value.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    showFieldError(phoneInput, '올바른 전화번호를 입력해주세요.');
    valid = false;
  }

  if (!generationInput.value) {
    showFieldError(generationInput, '기수를 입력해주세요.');
    valid = false;
  }

  if (!affiliationInput.value) {
    showFieldError(affiliationInput, '소속을 선택해주세요.');
    valid = false;
  }

  const dinner = document.querySelector('input[name="dinner"]:checked');
  if (!dinner) {
    const radioGroup = document.querySelector('.radio-group');
    radioGroup.style.outline = '2px solid #ff6b6b';
    radioGroup.style.borderRadius = '12px';
    valid = false;
  }

  return valid;
}

function showFieldError(input, msg) {
  input.classList.add('error');
  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.textContent = msg;
  errorEl.style.cssText = 'color:#ff6b6b;font-size:12px;margin-top:6px;';
  input.closest('.form-group').appendChild(errorEl);
}

function clearErrors() {
  document.querySelectorAll('.input.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.field-error').forEach(el => el.remove());
  const radioGroup = document.querySelector('.radio-group');
  if (radioGroup) {
    radioGroup.style.outline = 'none';
  }
}

// Clear error on input
regForm.addEventListener('input', (e) => {
  if (e.target.classList.contains('error')) {
    e.target.classList.remove('error');
    const err = e.target.closest('.form-group').querySelector('.field-error');
    if (err) err.remove();
  }
});

// ---- UI Helpers ----
function setSubmitLoading(loading) {
  const btnText = btnSubmit.querySelector('.btn-text');
  const btnSpinner = btnSubmit.querySelector('.btn-spinner');
  btnSubmit.disabled = loading;
  btnText.style.display = loading ? 'none' : '';
  btnSpinner.style.display = loading ? 'block' : 'none';
}

function resetForm() {
  regForm.reset();
  isEditMode = false;
  btnSubmit.querySelector('.btn-text').textContent = '참석 신청하기';
  clearErrors();
  lookupMessage.textContent = '';
}

// ---- "Another" Button ----
btnAnother.addEventListener('click', () => {
  resetForm();
  regForm.style.display = '';
  document.querySelector('.form-mode-toggle').style.display = '';
  successPanel.style.display = 'none';
  modeBtns[0].click();
  regForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---- Scroll Animations ----
const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.timeline-item').forEach(item => {
  observer.observe(item);
});

// ---- Smooth scroll for CTA ----
document.querySelector('.hero-cta').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('register').scrollIntoView({ behavior: 'smooth' });
});
