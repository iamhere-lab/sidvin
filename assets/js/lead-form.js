/* ==================================================================
   SIDVIN CELESTE — LEAD FORM ENGINE
   Handles: field validation, MSG91 SMS OTP, Google Sheets submit,
            enquiry popup, CTA wiring, 8-second auto-popup.
   Works for every <form class="lead-form"> on the page.
   ================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};

  var PLACEHOLDER = /PASTE_YOUR/;
  var DEMO_OTP = PLACEHOLDER.test(CFG.MSG91_WIDGET_ID || '') ||
                 PLACEHOLDER.test(CFG.MSG91_TOKEN_AUTH || '');
  var SHEET_READY = CFG.SHEET_ENDPOINT && !PLACEHOLDER.test(CFG.SHEET_ENDPOINT);

  /* ---------------------------------------------------------------- */
  /*  MSG91 widget bootstrap                                          */
  /* ---------------------------------------------------------------- */

  var msg91Ready = null;

  var MSG91_SRC = 'https://verify.msg91.com/otp-provider.js';
  var EXPOSE_TIMEOUT_MS = 12000;

  /* initSendOTP() returns before the widget has finished booting, so
     window.sendOtp / verifyOtp / retryOtp do not exist yet at that moment.
     Calling one immediately throws "window.sendOtp is not a function".
     This polls until the widget has actually published its methods. */
  function waitForMethods() {
    return new Promise(function (resolve, reject) {
      var started = new Date().getTime();
      (function poll() {
        if (typeof window.sendOtp === 'function' &&
            typeof window.verifyOtp === 'function') {
          return resolve(true);
        }
        if (new Date().getTime() - started > EXPOSE_TIMEOUT_MS) {
          return reject(new Error(
            'The OTP service did not start. Check that the MSG91 Widget ID and ' +
            'Token Auth are correct and that this domain is allowed on the widget.'));
        }
        setTimeout(poll, 100);
      })();
    });
  }

  function loadMsg91() {
    if (DEMO_OTP) return Promise.resolve(false);
    if (msg91Ready) return msg91Ready;

    msg91Ready = new Promise(function (resolve, reject) {
      // Already on the page (e.g. hot reload) — just wait for the methods.
      if (typeof window.initSendOTP === 'function') return resolve(true);

      var s = document.createElement('script');
      s.src = MSG91_SRC;
      s.async = true;
      s.onload = function () { resolve(true); };
      s.onerror = function () {
        reject(new Error('Could not reach the OTP service. Please check your connection.'));
      };
      document.head.appendChild(s);
    })
    .then(function () {
      if (typeof window.initSendOTP !== 'function') {
        throw new Error('The OTP service loaded but did not initialise.');
      }
      window.initSendOTP({
        widgetId: CFG.MSG91_WIDGET_ID,
        tokenAuth: CFG.MSG91_TOKEN_AUTH,
        exposeMethods: true,
        success: function () {},
        failure: function () {}
      });
      return waitForMethods();
    })
    .catch(function (err) {
      msg91Ready = null;          // let the next attempt retry from scratch
      throw err;
    });

    return msg91Ready;
  }

  /* Warm the widget up as soon as the page is idle, so the first user who
     presses Submit is not waiting on the script download as well. */
  function preloadMsg91() {
    if (DEMO_OTP) return;
    if (!document.querySelector('.lead-form')) return;
    setTimeout(function () { loadMsg91().catch(function () {}); }, 1200);
  }

  function sendOtp(identifier) {
    if (DEMO_OTP) {
      return new Promise(function (r) { setTimeout(r, 600); });
    }
    return loadMsg91().then(function () {
      return new Promise(function (resolve, reject) {
        window.sendOtp(identifier, resolve, function (e) {
          reject(new Error(readErr(e, 'We could not send the OTP. Please check the number.')));
        });
      });
    });
  }

  function retryOtp() {
    if (DEMO_OTP) {
      return new Promise(function (r) { setTimeout(r, 600); });
    }
    return loadMsg91().then(function () {
      return new Promise(function (resolve, reject) {
        // retryOtp(channel, success, failure, sessionId) — null channel keeps
        // the widget's configured primary channel (SMS), and the widget holds
        // the session itself, so sessionId is left out.
        window.retryOtp(null, resolve, function (e) {
          reject(new Error(readErr(e, 'Could not resend the OTP. Please try again.')));
        });
      });
    });
  }

  function verifyOtp(code) {
    if (DEMO_OTP) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          /^\d{6}$/.test(code)
            ? resolve({ demo: true })
            : reject(new Error('Please enter the 6-digit OTP.'));
        }, 500);
      });
    }
    return loadMsg91().then(function () {
      return new Promise(function (resolve, reject) {
        window.verifyOtp(code, resolve, function (e) {
          reject(new Error(readErr(e, 'That OTP is not correct. Please try again.')));
        });
      });
    });
  }

  /* Type SC_DIAG() in the browser console to see what the OTP layer is doing. */
  window.SC_DIAG = function () {
    var d = {
      demoMode: DEMO_OTP,
      widgetIdSet: !!CFG.MSG91_WIDGET_ID && !PLACEHOLDER.test(CFG.MSG91_WIDGET_ID),
      tokenAuthSet: !!CFG.MSG91_TOKEN_AUTH && !PLACEHOLDER.test(CFG.MSG91_TOKEN_AUTH),
      sheetEndpointSet: SHEET_READY,
      scriptOnPage: !!document.querySelector('script[src*="otp-provider.js"]'),
      initSendOTP: typeof window.initSendOTP,
      sendOtp: typeof window.sendOtp,
      verifyOtp: typeof window.verifyOtp,
      retryOtp: typeof window.retryOtp
    };
    console.table(d);
    return d;
  };

  function readErr(e, fallback) {
    if (!e) return fallback;
    if (typeof e === 'string') return e;
    return e.message || (e.data && e.data.message) || fallback;
  }

  /* ---------------------------------------------------------------- */
  /*  Validation                                                      */
  /* ---------------------------------------------------------------- */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  var PHONE_RE = /^[6-9]\d{9}$/;

  function validators(form) {
    return {
      name: function (v) {
        if (!v.trim()) return 'Please enter your name.';
        if (v.trim().length < 2) return 'Please enter your full name.';
        if (!/^[a-zA-ZÀ-ɏ .'-]+$/.test(v.trim())) return 'Name can only contain letters.';
        return '';
      },
      email: function (v) {
        if (!v.trim()) return 'Please enter your email address.';
        if (!EMAIL_RE.test(v.trim())) return 'Please enter a valid email address.';
        return '';
      },
      phone: function (v) {
        var d = v.replace(/\D/g, '');
        if (!d) return 'Please enter your mobile number.';
        if (!PHONE_RE.test(d)) return 'Enter a valid 10-digit Indian mobile number.';
        return '';
      },
      configuration: function (v) {
        if (!v) return 'Please select a configuration.';
        return '';
      }
    };
  }

  function fieldWrap(input) {
    return input.closest('.field') || input.parentNode;
  }

  function setError(input, message) {
    var wrap = fieldWrap(input);
    var slot = wrap.querySelector('.field-error');
    if (!slot) {
      slot = document.createElement('span');
      slot.className = 'field-error';
      wrap.appendChild(slot);
    }
    slot.textContent = message || '';
    wrap.classList.toggle('has-error', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  /* ---------------------------------------------------------------- */
  /*  Google Sheets submit                                            */
  /* ---------------------------------------------------------------- */

  function sendToSheet(payload) {
    if (!SHEET_READY) {
      console.warn('[Sidvin] SHEET_ENDPOINT not configured — lead not sent:', payload);
      return Promise.resolve({ skipped: true });
    }

    var body = JSON.stringify(payload);

    // text/plain keeps this a "simple request" so the browser sends no
    // CORS preflight, which Apps Script cannot answer.
    return fetch(CFG.SHEET_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow'
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .catch(function () {
        // Opaque fallback: the row still lands in the sheet, we just
        // cannot read the response.
        return fetch(CFG.SHEET_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: body
        }).then(function () { return { opaque: true }; });
      });
  }

  /* ---------------------------------------------------------------- */
  /*  Form controller                                                 */
  /* ---------------------------------------------------------------- */

  function initForm(form) {
    var v = validators(form);
    var inputs = {
      name: form.querySelector('[name="name"]'),
      email: form.querySelector('[name="email"]'),
      phone: form.querySelector('[name="phone"]'),
      configuration: form.querySelector('[name="configuration"]')
    };

    var otpPanel = form.querySelector('.otp-panel');
    var otpInput = form.querySelector('[name="otp"]');
    var otpTarget = form.querySelector('.otp-target');
    var otpVerifyBtn = form.querySelector('.otp-verify');
    var otpResendBtn = form.querySelector('.otp-resend');
    var otpEditBtn = form.querySelector('.otp-edit');
    var otpMsg = form.querySelector('.otp-message');
    var submitBtn = form.querySelector('.form-submit');
    var formMsg = form.querySelector('.form-message');
    var badge = form.querySelector('.verified-badge');

    var state = { verified: false, verifiedNumber: '', sending: false, submitting: false };
    var timer = null;

    /* --- live validation ------------------------------------------ */
    Object.keys(inputs).forEach(function (key) {
      var el = inputs[key];
      if (!el) return;

      if (key === 'phone') {
        el.addEventListener('input', function () {
          el.value = el.value.replace(/\D/g, '').slice(0, 10);
          if (state.verified && el.value !== state.verifiedNumber) resetVerification();
        });
      }

      el.addEventListener('blur', function () { setError(el, v[key](el.value)); });
      el.addEventListener('input', function () {
        if (fieldWrap(el).classList.contains('has-error')) setError(el, v[key](el.value));
      });
    });

    if (otpInput) {
      otpInput.addEventListener('input', function () {
        otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
        if (otpInput.value.length === 6) doVerify();
      });
      otpInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doVerify(); }
      });
    }

    function validateAll() {
      var ok = true;
      Object.keys(inputs).forEach(function (key) {
        var el = inputs[key];
        if (!el) return;
        var msg = v[key](el.value);
        setError(el, msg);
        if (msg && ok) { ok = false; el.focus(); }
      });
      return ok;
    }

    /* --- OTP panel ------------------------------------------------- */
    function showOtpPanel(show) {
      if (!otpPanel) return;
      otpPanel.hidden = !show;
      form.classList.toggle('otp-active', show);
      if (show) {
        if (otpTarget) otpTarget.textContent = '+' + CFG.COUNTRY_CODE + ' ' + inputs.phone.value;
        if (otpInput) { otpInput.value = ''; setTimeout(function () { otpInput.focus(); }, 120); }
      }
    }

    function otpNote(text, kind) {
      if (!otpMsg) return;
      otpMsg.textContent = text || '';
      otpMsg.className = 'otp-message' + (kind ? ' is-' + kind : '');
    }

    function formNote(text, kind) {
      if (!formMsg) return;
      formMsg.textContent = text || '';
      formMsg.className = 'form-message' + (kind ? ' is-' + kind : '');
    }

    function startResendTimer() {
      if (!otpResendBtn) return;
      var left = CFG.OTP_RESEND_SECONDS || 30;
      otpResendBtn.disabled = true;
      clearInterval(timer);
      otpResendBtn.textContent = 'Resend OTP in ' + left + 's';
      timer = setInterval(function () {
        left -= 1;
        if (left <= 0) {
          clearInterval(timer);
          otpResendBtn.disabled = false;
          otpResendBtn.textContent = 'Resend OTP';
        } else {
          otpResendBtn.textContent = 'Resend OTP in ' + left + 's';
        }
      }, 1000);
    }

    function resetVerification() {
      state.verified = false;
      state.verifiedNumber = '';
      if (badge) badge.hidden = true;
      showOtpPanel(false);
      clearInterval(timer);
      setSubmitLabel('Submit Now');
    }

    function setSubmitLabel(text, busy) {
      if (!submitBtn) return;
      submitBtn.textContent = text;
      submitBtn.disabled = !!busy;
      submitBtn.classList.toggle('is-busy', !!busy);
    }

    /* --- send OTP -------------------------------------------------- */
    function doSend(isRetry) {
      if (state.sending) return;
      state.sending = true;

      var identifier = CFG.COUNTRY_CODE + inputs.phone.value;
      otpNote('Sending OTP…', 'muted');
      if (!isRetry) setSubmitLabel('Sending OTP…', true);

      var call = isRetry ? retryOtp() : sendOtp(identifier);

      call.then(function () {
        state.sending = false;
        showOtpPanel(true);
        setSubmitLabel('Submit Now');
        otpNote(DEMO_OTP
          ? 'Demo mode — enter any 6 digits to continue.'
          : 'OTP sent to your mobile number.', 'ok');
        startResendTimer();
      }).catch(function (err) {
        state.sending = false;
        setSubmitLabel('Submit Now');
        otpNote(err.message, 'error');
        formNote(err.message, 'error');
      });
    }

    /* --- verify OTP ------------------------------------------------ */
    function doVerify() {
      if (!otpInput) return;
      var code = otpInput.value.trim();
      if (!/^\d{6}$/.test(code)) { otpNote('Please enter the 6-digit OTP.', 'error'); return; }

      otpNote('Verifying…', 'muted');
      if (otpVerifyBtn) otpVerifyBtn.disabled = true;

      verifyOtp(code).then(function () {
        if (otpVerifyBtn) otpVerifyBtn.disabled = false;
        state.verified = true;
        state.verifiedNumber = inputs.phone.value;
        clearInterval(timer);
        showOtpPanel(false);
        if (badge) badge.hidden = false;
        otpNote('');
        formNote('Mobile number verified. Submitting…', 'ok');
        submitLead();
      }).catch(function (err) {
        if (otpVerifyBtn) otpVerifyBtn.disabled = false;
        otpNote(err.message, 'error');
        otpInput.select();
      });
    }

    /* --- final submit ---------------------------------------------- */
    function submitLead() {
      if (state.submitting) return;
      state.submitting = true;
      setSubmitLabel('Submitting…', true);

      var payload = {
        name: inputs.name.value.trim(),
        email: inputs.email.value.trim(),
        phone: '+' + CFG.COUNTRY_CODE + ' ' + inputs.phone.value,
        configuration: inputs.configuration.value,
        source: form.getAttribute('data-source') || 'website',
        page: location.pathname
      };

      sendToSheet(payload).then(function () {
        try {
          sessionStorage.setItem('sc_lead_name', payload.name);
          sessionStorage.setItem('sc_lead_config', payload.configuration);
        } catch (e) {}
        if (window.gtag) {
          window.gtag('event', 'generate_lead', { form_source: payload.source });
        }
        window.location.href = CFG.THANK_YOU_URL;
      }).catch(function () {
        state.submitting = false;
        setSubmitLabel('Submit Now');
        formNote('Something went wrong. Please try again.', 'error');
      });
    }

    /* --- wiring ----------------------------------------------------- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      formNote('');
      if (!validateAll()) return;

      if (state.verified && inputs.phone.value === state.verifiedNumber) {
        submitLead();
      } else {
        doSend(false);
      }
    });

    if (otpVerifyBtn) otpVerifyBtn.addEventListener('click', function (e) { e.preventDefault(); doVerify(); });
    if (otpResendBtn) otpResendBtn.addEventListener('click', function (e) { e.preventDefault(); doSend(true); });
    if (otpEditBtn) otpEditBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showOtpPanel(false);
      clearInterval(timer);
      inputs.phone.focus();
      inputs.phone.select();
    });

    showOtpPanel(false);
  }

  /* ---------------------------------------------------------------- */
  /*  Enquiry popup                                                   */
  /* ---------------------------------------------------------------- */

  var modal, lastFocus;

  function openModal(source) {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(function () { modal.classList.add('is-open'); });

    var f = modal.querySelector('.lead-form');
    if (f && source) f.setAttribute('data-source', source);
    var first = modal.querySelector('input, select');
    if (first) setTimeout(function () { first.focus(); }, 260);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    setTimeout(function () { modal.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  window.openEnquiry = openModal;
  window.closeEnquiry = closeModal;

  function initModal() {
    modal = document.getElementById('enquiry-modal');
    if (!modal) return;

    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) {
        e.preventDefault();
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    // Every CTA on the page opens the popup.
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-enquiry]');
      if (!trigger) return;
      e.preventDefault();
      openModal(trigger.getAttribute('data-enquiry') || 'cta');
    });

    // Auto-open after the configured delay (home page only).
    if (document.body.getAttribute('data-page') === 'home') {
      var seen = false;
      try {
        seen = CFG.POPUP_ONCE_PER_SESSION && sessionStorage.getItem('sc_popup_seen') === '1';
      } catch (e) {}

      if (!seen) {
        setTimeout(function () {
          if (modal.hidden && !document.body.classList.contains('modal-open')) {
            openModal('auto-popup-8s');
            try { sessionStorage.setItem('sc_popup_seen', '1'); } catch (e) {}
          }
        }, CFG.POPUP_DELAY_MS || 8000);
      }
    }
  }

  /* ---------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    initModal();
    Array.prototype.forEach.call(document.querySelectorAll('.lead-form'), initForm);
    preloadMsg91();

    if (DEMO_OTP) {
      console.info('[Sidvin] MSG91 demo mode — any 6-digit OTP is accepted. ' +
                   'Add MSG91_WIDGET_ID and MSG91_TOKEN_AUTH in assets/js/config.js to go live.');
    }
    if (!SHEET_READY) {
      console.info('[Sidvin] SHEET_ENDPOINT not set — submissions are logged to the console only.');
    }
  });
})();
