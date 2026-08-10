/* اختبار القيادة النظري — تطبيق تفاعلي على أسئلة النزاوي لتعليم القيادة
   مع حساب حقيقي (تسجيل دخول) ومزامنة التقدم عبر Netlify Functions + Blobs */
(function () {
  'use strict';

  var LETTERS = ['أ', 'ب', 'ج', 'د'];
  var ORDINALS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة'];
  var app = document.getElementById('app');

  // ---------- تخزين محلي خام ----------
  function rawRead(key, fallback) {
    try {
      var v = localStorage.getItem('nizawi_' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function rawWrite(key, val) {
    try { localStorage.setItem('nizawi_' + key, JSON.stringify(val)); } catch (e) {}
  }
  function rawRemove(key) {
    try { localStorage.removeItem('nizawi_' + key); } catch (e) {}
  }

  // ---------- جلسة المستخدم (JWT) ----------
  var token = rawRead('token', null);
  var user = rawRead('user', null); // {name, email}

  function apiFetch(path, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (opts.body !== undefined) opts.headers['Content-Type'] = 'application/json';
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    return fetch('/api/' + path, opts);
  }

  // ---------- حالة التقدم (محلي + سحابي) ----------
  var flags = new Set();
  var wrongPool = new Set();
  var best = {};
  var shufflePref = false;
  var savedSessions = []; // كل الجلسات غير المكتملة [{sid,ids,i,answers,mode,title,shuffled,savedAt}]
  var syncTimer = null;
  var syncFailed = false;

  function cacheKey() { return 'cache_' + (user ? user.email : 'anon'); }

  function blob() {
    return {
      flags: Array.from(flags),
      wrong: Array.from(wrongPool),
      best: best,
      shuffle: shufflePref,
      sessions: savedSessions,
      // توافق للخلف: النسخ القديمة من التطبيق تقرأ حقل الجلسة المفردة
      session: savedSessions[0] || null
    };
  }

  // دمج جلسات من مصدر آخر دون فقدان أي جلسة (الأحدث لكل معرف يفوز)
  function mergeSessions(extra) {
    var changed = false;
    (extra || []).forEach(function (s) {
      if (!s || !Array.isArray(s.ids) || !s.ids.length) return;
      if (!s.sid) s.sid = 's_legacy';
      var idx = -1;
      for (var i = 0; i < savedSessions.length; i++) {
        if (savedSessions[i].sid === s.sid) { idx = i; break; }
      }
      if (idx === -1) { savedSessions.push(s); changed = true; }
      else if ((s.savedAt || 0) > (savedSessions[idx].savedAt || 0)) { savedSessions[idx] = s; changed = true; }
    });
    savedSessions.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
    if (savedSessions.length > 6) savedSessions.length = 6;
    return changed;
  }

  function hydrate(d) {
    d = d || {};
    flags = new Set(d.flags || []);
    wrongPool = new Set(d.wrong || []);
    best = d.best || {};
    shufflePref = !!d.shuffle;
    savedSessions = Array.isArray(d.sessions) ? d.sessions.slice(0, 6) : [];
    // الجلسة المفردة القديمة تُدمج دائمًا ولا تُهمل حتى مع وجود القائمة
    if (d.session && Array.isArray(d.session.ids)) mergeSessions([d.session]);
  }

  function persist() {
    rawWrite(cacheKey(), blob());
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(pushToServer, 1200);
  }

  function pushToServer() {
    if (!token) return;
    apiFetch('data', { method: 'PUT', body: JSON.stringify({ data: blob() }), keepalive: true })
      .then(function (r) {
        syncFailed = !r.ok;
        if (r.status === 401) logout();
      })
      .catch(function () { syncFailed = true; });
  }

  window.addEventListener('beforeunload', function () {
    if (syncTimer) { clearTimeout(syncTimer); pushToServer(); }
  });
  // على الجوال: إخفاء الصفحة أوثق من beforeunload لدفع المزامنة فورًا
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
      pushToServer();
    }
  });

  function logout() {
    token = null; user = null;
    rawRemove('token'); rawRemove('user');
    hydrate(null);
    renderAuth();
  }

  // ترحيل بيانات النسخ السابقة (المستخدم المحلي القديم) عند أول تسجيل
  function legacyData() {
    var pid = rawRead('currentProfile', null);
    var d = null;
    function grab(prefix) {
      var f = rawRead(prefix + 'flags', null), w = rawRead(prefix + 'wrong', null);
      if (f === null && w === null) return null;
      return {
        flags: f || [], wrong: w || [],
        best: rawRead(prefix + 'best', {}) || {},
        shuffle: !!rawRead(prefix + 'shuffle', false),
        session: rawRead(prefix + 'session', null)
      };
    }
    if (pid) d = grab(pid + '_');
    if (!d) d = grab('');
    return d;
  }

  // ---------- فهرسة الأسئلة ----------
  var allQuestions = [];
  QUIZ_UNITS.forEach(function (u) {
    u.questions.forEach(function (q) {
      q.unit = u.num;
      q.unitTitle = u.full;
      q.id = 'u' + u.num + 'q' + q.n;
      allQuestions.push(q);
    });
  });
  var byId = {};
  allQuestions.forEach(function (q) { byId[q.id] = q; });

  // أسئلة البرنامج الأصفر الإضافية (قسم مستقل لا يدخل في الاختبار الشامل)
  var extraQuestions = (typeof EXTRA_QUESTIONS !== 'undefined') ? EXTRA_QUESTIONS : [];
  extraQuestions.forEach(function (q) {
    q.unit = 0;
    q.unitTitle = 'أسئلة إضافية من البرنامج الأصفر';
    q.id = 'xq' + q.n;
    byId[q.id] = q;
  });

  function isCorrectChoice(q, idx) {
    if (idx === q.correct) return true;
    return Array.isArray(q.alsoCorrect) && q.alsoCorrect.indexOf(idx) !== -1;
  }

  // ---------- حالة جلسة الاختبار ----------
  var session = null;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function persistSession() {
    if (session) {
      var snap = {
        sid: session.sid,
        ids: session.questions.map(function (q) { return q.id; }),
        i: session.i,
        answers: session.answers,
        mode: session.mode,
        title: session.title,
        shuffled: session.shuffled,
        savedAt: Date.now()
      };
      savedSessions = savedSessions.filter(function (s) { return s.sid !== session.sid; });
      savedSessions.unshift(snap);
      if (savedSessions.length > 6) savedSessions.length = 6;
    }
    persist();
  }

  function removeSavedSession(sid) {
    savedSessions = savedSessions.filter(function (s) { return s.sid !== sid; });
    persist();
  }

  function validSavedSessions() {
    return savedSessions.filter(function (s) {
      if (!s || !Array.isArray(s.ids) || !s.ids.length) return false;
      return s.ids.every(function (id) { return byId[id]; });
    });
  }

  function resumeSession(s) {
    session = {
      sid: s.sid,
      questions: s.ids.map(function (id) { return byId[id]; }),
      i: Math.min(s.i, s.ids.length - 1),
      answers: s.answers || {},
      mode: s.mode,
      title: s.title,
      shuffled: !!s.shuffled
    };
    renderQuestion();
    window.scrollTo(0, 0);
  }

  function startSession(questions, mode, title, doShuffle) {
    if (!questions.length) return;
    session = {
      sid: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      questions: doShuffle ? shuffle(questions) : questions.slice(),
      i: 0,
      answers: {},
      mode: mode,
      title: title,
      shuffled: !!doShuffle
    };
    persistSession();
    renderQuestion();
    window.scrollTo(0, 0);
  }

  // ---------- أدوات DOM ----------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ---------- شاشة الدخول / إنشاء الحساب ----------
  var AUTH_ERRORS = {
    email_exists: 'هذا البريد مسجل مسبقًا — جربي تسجيل الدخول',
    bad_credentials: 'البريد أو كلمة المرور غير صحيحة',
    weak_password: 'كلمة المرور يجب ألا تقل عن 6 أحرف',
    bad_email: 'فضلًا أدخلي بريدًا إلكترونيًا صحيحًا',
    name_required: 'فضلًا أدخلي الاسم',
    too_many_attempts: 'محاولات كثيرة — انتظري قليلًا ثم أعيدي المحاولة',
    server_error: 'خطأ في الخادم — أعيدي المحاولة',
    network: 'تعذر الاتصال — تحققي من الإنترنت وأعيدي المحاولة'
  };

  function renderAuth(startTab) {
    session = null;
    app.innerHTML = '';

    var header = el('div', 'site-header');
    header.appendChild(el('h1', null, '🚗 اختبار القيادة النظري'));
    header.appendChild(el('p', 'sub', 'حساب واحد يحفظ تقدمك ويتابعك على أي جهاز'));
    app.appendChild(header);

    var card = el('div', 'card register-card');

    var tabs = el('div', 'auth-tabs');
    var tabLogin = el('button', 'auth-tab', 'تسجيل الدخول');
    var tabRegister = el('button', 'auth-tab', 'حساب جديد');
    tabs.appendChild(tabLogin);
    tabs.appendChild(tabRegister);
    card.appendChild(tabs);

    var form = el('form', 'register-form');
    card.appendChild(form);
    card.appendChild(el('p', 'register-note', '🔒 كلمة المرور تُحفظ مشفرة، وتقدمك يُحفظ في حسابك ويظهر على أي جهاز تسجلين دخولك منه.'));
    app.appendChild(card);

    var mode = startTab || 'login';

    function build() {
      tabLogin.className = 'auth-tab' + (mode === 'login' ? ' active' : '');
      tabRegister.className = 'auth-tab' + (mode === 'register' ? ' active' : '');
      form.innerHTML = '';
      var nameInput = null;
      if (mode === 'register') {
        form.appendChild(el('label', 'field-label', 'الاسم'));
        nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.className = 'field-input';
        nameInput.placeholder = 'مثال: ابتهال'; nameInput.maxLength = 60;
        form.appendChild(nameInput);
      }
      form.appendChild(el('label', 'field-label', 'البريد الإلكتروني'));
      var emailInput = document.createElement('input');
      emailInput.type = 'email'; emailInput.className = 'field-input';
      emailInput.placeholder = 'name@example.com'; emailInput.autocomplete = 'email';
      form.appendChild(emailInput);
      form.appendChild(el('label', 'field-label', 'كلمة المرور'));
      var passInput = document.createElement('input');
      passInput.type = 'password'; passInput.className = 'field-input';
      passInput.placeholder = mode === 'register' ? '6 أحرف على الأقل' : '';
      passInput.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
      form.appendChild(passInput);
      var err = el('div', 'field-error');
      form.appendChild(err);
      var submit = el('button', 'btn btn-primary register-btn', mode === 'register' ? 'إنشاء الحساب والبدء 🚀' : 'دخول');
      submit.type = 'submit';
      form.appendChild(submit);

      form.onsubmit = function (ev) {
        ev.preventDefault();
        err.textContent = '';
        submit.disabled = true;
        submit.textContent = '... لحظات';
        var payload = { email: emailInput.value.trim(), password: passInput.value };
        if (mode === 'register') payload.name = nameInput.value.trim();
        apiFetch(mode === 'register' ? 'register' : 'login', {
          method: 'POST',
          body: JSON.stringify(payload)
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (!res.ok) {
              err.textContent = AUTH_ERRORS[res.j.error] || AUTH_ERRORS.server_error;
              submit.disabled = false;
              submit.textContent = mode === 'register' ? 'إنشاء الحساب والبدء 🚀' : 'دخول';
              return;
            }
            token = res.j.token;
            user = { name: res.j.name, email: res.j.email };
            rawWrite('token', token);
            rawWrite('user', user);
            bootData(mode === 'register');
          })
          .catch(function () {
            err.textContent = AUTH_ERRORS.network;
            submit.disabled = false;
            submit.textContent = mode === 'register' ? 'إنشاء الحساب والبدء 🚀' : 'دخول';
          });
      };
    }

    tabLogin.addEventListener('click', function () { mode = 'login'; build(); });
    tabRegister.addEventListener('click', function () { mode = 'register'; build(); });
    build();
  }

  // تحميل بيانات الحساب من الخادم بعد الدخول أو عند فتح الموقع
  function bootData(isNewAccount) {
    app.innerHTML = '';
    var loading = el('div', 'card register-card', '<div class="loading-msg">⏳ جارٍ تحميل تقدمك ...</div>');
    app.appendChild(loading);

    apiFetch('data', { method: 'GET' })
      .then(function (r) {
        if (r.status === 401) { logout(); return null; }
        return r.json();
      })
      .then(function (j) {
        if (!j) return;
        user = { name: j.name, email: j.email };
        rawWrite('user', user);
        if (j.data) {
          hydrate(j.data);
          // دمج جلسات النسخة المحلية إن كانت أحدث أو غير موجودة على الخادم
          var localCache = rawRead(cacheKey(), null);
          var merged = false;
          if (localCache) {
            var extra = Array.isArray(localCache.sessions) ? localCache.sessions.slice() : [];
            if (localCache.session && Array.isArray(localCache.session.ids)) extra.push(localCache.session);
            merged = mergeSessions(extra);
          }
          rawWrite(cacheKey(), blob());
          if (merged) pushToServer();
        } else {
          // حساب جديد بلا بيانات: نرحّل بيانات الجهاز السابقة إن وجدت
          var local = rawRead(cacheKey(), null) || legacyData();
          hydrate(local);
          if (local) pushToServer();
        }
        renderHome();
      })
      .catch(function () {
        // لا اتصال: نستخدم آخر نسخة محفوظة على الجهاز
        hydrate(rawRead(cacheKey(), null));
        syncFailed = true;
        renderHome();
      });
  }

  // ---------- ملخصات الوحدات ----------
  var UNIT_SUMMARIES = [
    {
      t: 'الأولى — المقدمة (المسافات والقوانين)',
      pts: [
        'رخصة القيادة الخاصة: حتى <b>٩ أشخاص</b> بمن فيهم السائق، ومركبات نقل خاص حتى <b>٣٥٠٠ كغم</b>.',
        'زمن ردة الفعل ≈ <b>ثانية واحدة</b>، والمسافة المقطوعة في الثانية ≈ (السرعة ÷ ١٠) × ٣.',
        'مثالا الوحدة: بسرعة <b>٦٠</b> كم/س تقطعين في الثانية (٦ × ٣) = <b>١٨ مترًا</b> | بسرعة <b>٣٠</b> كم/س (٣ × ٣) = <b>٩ أمتار</b>.',
        '<b>مسافة ردة الفعل = (السرعة ÷ ١٠) × ٣</b> — تطول مع السرعة والتشتت والتعب والمخدرات (كلها).',
        '<b>مسافة الفرملة = (السرعة ÷ ١٠) × (السرعة ÷ ١٠)</b> — تطول أساسًا مع السرعة العالية.',
        '<b>مسافة التوقف = ردة الفعل + الفرملة</b>. مثال ٥٠ كم/س: ١٥ + ٢٥ = <b>٤٠ مترًا</b>.',
        'تقليل مسافة التوقف: خففي السرعة، وانتبهي، وأبقي قدمك فوق الفرامل دون ضغط.',
        'عند وقوع حادث: أوقفي وأبلغي + أمّني الموقع + ساعدي المصابين (كلها واجبة).',
        'إيقاف المركبة أمام المداخل مخالفة عادية <b>خارج</b> نظام النقاط.'
      ]
    },
    {
      t: 'الثانية — منطقة المرور (أشكال الإشارات)',
      pts: [
        'تحذير = <b>مثلث رأسه للأعلى</b> | أفسح الطريق = <b>مثلث مقلوب</b> | قف = <b>ثماني الشكل</b>.',
        'منع = <b>دائرة بإطار أحمر</b> | إلزام = <b>دائرة زرقاء</b> (اتجاه إجباري، ممر مشاة، حد أدنى للسرعة).',
        'رقم في دائرة حمراء = <b>حد أقصى للسرعة</b> | رقم في دائرة زرقاء = <b>حد أدنى</b> | مشطوبة = نهاية الحد.',
        'الخط الصلب (المتصل) / المزدوج: <b>يحظر عبوره</b> مهما كانت الظروف.',
        'دائرة حمراء مشطوبة على شكل U = ممنوع الدوران للخلف.',
        'عند إشارة قف مع معبر مشاة: توقفي قبل خط الوقوف بحيث يبقى مرئيًا أمامك.'
      ]
    },
    {
      t: 'الثالثة — السلوك (الركاب والفئات الضعيفة)',
      pts: [
        '<b>حزام الأمان إلزامي للجميع</b> — سائقًا وركابًا، أمامًا وخلفًا.',
        'الأطفال دون <b>١٢ سنة</b> في مقاعد مخصصة، والجلوس في المقعد الأمامي من <b>١٠ سنوات</b> (أو عند عدم وجود مقاعد خلفية).',
        'ممنوع تجاوز <b>الحافلة المدرسية المتوقفة</b> لصعود ونزول الطلاب.',
        'مركبات الطوارئ لها حقوق خاصة: أخلي المسار فورًا واحفظي <b>٥٠ م</b> خلفها.',
        'الأطفال وكبار السن الأخطر على الطريق: توقعي حركتهم المفاجئة وخففي السرعة.',
        'لا تقودي عند: المرض الشديد، الكسور، الإرهاق، التشتت العاطفي، أو دواء يؤثر على التركيز.',
        'مع مستخدم طريق مشتت: تواصل بصري + زيادة المسافة + الاستعداد لتفادي خطئه.'
      ]
    },
    {
      t: 'الرابعة — حركة المرور (المسارات والدوار)',
      pts: [
        '<b>قاعدة اليمين:</b> التزمي أقصى يمين الطريق ما كان ذلك ممكنًا وآمنًا.',
        '<b>النقطة العمياء</b> لا تظهر في المرايا — تُفحص بنظرة سريعة جهة الكتف.',
        'خطوات تغيير المسار/الانعطاف: <b>مرايا ← إشارة ← كتف ← سرعة ← تحرك</b>.',
        'أعطي إشارة قبل تخفيف السرعة لتجنب الاصطدام الخلفي.',
        'الدوار: مخرج أول (يمين) = <b>مسار ١</b> | أمام = <b>مسار ٢</b> | يسار/حذوة فرس = <b>مسار ٣</b>.',
        'إشارة اليمين للخروج من الدوار: عند جزيرة المخرج الذي <b>قبل</b> مخرجك.',
        'الرجوع للخلف على الطريق العام: للضرورة فقط ولمسافة لا تتجاوز <b>٢٠ م</b>.',
        'الانعطاف يمينًا: قريبًا من الحافة بزاوية حادة مع الانتباه للعجلة الخلفية.'
      ]
    },
    {
      t: 'الخامسة — المعابر (الأولويات)',
      pts: [
        'الإشارة العمودية من الأعلى: <b>أحمر ← برتقالي ← أخضر</b>.',
        'أصفر متقطع = تقدمي بحذر مع إعطاء الأولوية | <b>أحمر متقطع = عامليها كإشارة قف</b>.',
        'إشارة قف: توقف تام <b>٣ ثوانٍ</b> تتحققين خلالها من الطريق | المثلث المقلوب: أفسحي دون توقف إلزامي.',
        'تقاطع غير منظم: <b>الأولوية لمن على اليمين</b> عند الوصول معًا | من وصل ودخل أولًا يعبر أولًا.',
        'المستمر للأمام له الأولوية على المنعطف يسارًا | من ينعطف حذوة فرس يفسح للجميع.',
        'الداخل من طريق فرعي أو طريق خدمة يفسح لمن على <b>الطريق الرئيسي</b>.',
        'في المنحدرات الحادة: الأولوية <b>للصاعد</b> وعلى النازل الإفساح.',
        'الدوار: من بداخله له الأولوية على الداخل إليه.',
        'قاعدة <b>LADA</b> قبل اتخاذ قرار أي انعطاف: <b>تنظر ← تقيّم ← تقرر ← تتصرف</b> (Look – Assess – Decide – Act).',
        'السكة الحديدية: لا عبور عند بدء إغلاق الحواجز، ولا دخول معبر/تقاطع إلا إذا أمكن الخروج كاملًا.',
        'الانعطاف يمينًا مع إشارة حمراء: مسموح فقط إن لم توجد إشارة تمنعه، وبعد توقف تام وتأكد من الأمان.'
      ]
    },
    {
      t: 'السادسة — سرعة القيادة (الحدود ومسافة الأمان)',
      pts: [
        'الحدود العامة: الصغيرة داخل المدينة <b>٨٠</b> وخارجها <b>١٢٠</b> | الكبيرة داخل المدينة <b>٥٠</b> وخارجها <b>١٠٠</b> كم/س.',
        'خففي دون الحد الأقصى عند: ضعف الرؤية، المطر والضباب والغبار، الطرق الزلقة، المنحنيات، التقاطعات، المعابر، الأنفاق والجسور.',
        '<b>مسافة الأمان ≥ ثانيتين</b>: عدّي «ألف وواحد، ألف واثنان» من مرور المركبة الأمامية بنقطة ثابتة.',
        'زيديها عن ثانيتين في: الظروف السيئة، الحمولة الثقيلة، وخلف الدراجات النارية.',
        'الفرملة القوية ممنوعة إلا للضرورة — والقيادة البطيئة المعرقلة ممنوعة أيضًا.',
        'سباق المركبات ممنوع على كل الطرق العامة.'
      ]
    },
    {
      t: 'السابعة — التجاوز',
      pts: [
        'الأصل: التجاوز من <b>اليسار</b> | من اليمين فقط إذا كانت المركبة الأمامية منعطفة يسارًا.',
        'ممنوع عند: التقاطعات ومعابر المشاة والسكك، قمم التلال والجسور، المنحنيات، ضعف الرؤية، الطرق الزلقة.',
        'ممنوع أيضًا: إذا كان من أمامك أو خلفك يتجاوز، أو إذا استلزم كسر حد السرعة.',
        'الخط المتقطع يسمح بالتجاوز، والمتصل يمنعه.',
        'قبل التجاوز: مرايا ← إشارة يسار ← نظرة <b>الكتف الأيسر</b> ← سرعة ← تحرك سلس.',
        'العودة للمسار: عندما ترين المركبة المتجاوَزة <b>كاملة في المرآة الداخلية</b>.',
        'إذا تُجووز عنك: التزمي أقصى اليمين وحافظي على سرعة ثابتة — <b>لا تزيدي السرعة</b>.',
        'مركبة معطلة: ضعي مثلث التحذير خلفها ضمن مسافة التوقف (وليلًا أضيئي أضواءً حمراء).'
      ]
    },
    {
      t: 'الثامنة — السلوك العام (الوقوف والأضواء)',
      pts: [
        'الوقوف الصحيح: <b>موازيًا للرصيف</b> باتجاه السير حيث لا توجد إشارة منع.',
        'ممنوع الوقوف: عكس الاتجاه، وسط الطريق، على المعابر، وعلى بعد <b>٢٠ م أو أقل</b> من الجسور والأنفاق وعليها.',
        'خط مائل واحد في دائرة زرقاء = <b>ممنوع الوقوف</b> (الانتظار) | خطان متقاطعان (X) = <b>ممنوع التوقف نهائيًا</b>.',
        'يسري منع الوقوف من الإشارة حتى <b>أول منعطف</b> بعدها.',
        'الأضواء المنخفضة: ليلًا وفي الضباب والعواصف — حتى نهارًا إذا حجبت الرؤية.',
        'الأضواء العالية: خارج المدينة عند خلو الطريق فقط — ممنوعة داخل المدينة ومع مرور مقابل وخلف مركبة ≤ <b>٥٠ م</b>.',
        'ضوء أبيض خلفي = المركبة سترجع للخلف (وضعية R) | مصباح تحكم <b>أحمر</b> في اللوحة = توقفي فورًا.',
        'إزالة ضباب الزجاج: وجهي المروحة للزجاج + أعلى قوة + شغلي المكيف.'
      ]
    }
  ];

  // ---------- جدول النقاط للمخالفات المرورية ----------
  // العنصر الثالث = وردت في أسئلة الاختبار (النزاوي أو البرنامج الأصفر)
  var VIOLATIONS = [
    ['قيادة المركبة تحت تأثير سكر أو مخدر', 24],
    ['التفحيط', 24],
    ['تجاوز إشارة المرور الضوئية أثناء الضوء الأحمر', 12, 1],
    ['قيادة المركبة بالاتجاه المعاكس لحركة السير', 12, 1],
    ['المراوغة بسرعة بين المركبات على الطرق العامة', 8, 1],
    ['عدم التقيد بإشارة رجل الأمن اليدوية', 8],
    ['قيادة المركبة بدون مكابح أو أنوار', 8, 1],
    ['عدم الوقوف تمامًا عند إشارة قف', 6],
    ['عدم مراعاة قواعد الأفضلية', 6, 1],
    ['تجاوز السرعة المحددة بأكثر من ٢٥ كم في الساعة', 6, 1],
    ['عدم إعطاء الأفضلية للسيارات التي بداخل الدوار', 6, 1],
    ['التجاوز في المناطق التي يمنع التجاوز فيها', 6],
    ['الوقوف على خطوط السكة الحديدية', 6],
    ['تجاوز السرعة المحددة بمقدار لا يزيد عن ٢٥ كم في الساعة', 4],
    ['القيادة في مسارات غير مخصصة لذلك', 4, 1],
    ['تجاوز حافلات النقل المدرسي عند توقفها للتحميل والتنزيل', 4, 1],
    ['عدم تغطية وتربيط الحمولة المنقولة', 4],
    ['إجراء أي تعديل أو إضافة على هيكل أو جسم المركبة بدون اتخاذ الإجراءات النظامية', 4],
    ['عدم ربط حزام الأمان', 2, 1],
    ['استخدام الهاتف المحمول باليد أثناء القيادة', 2],
    ['عدم ارتداء الخوذة أثناء قيادة الدراجات الآلية', 2]
  ];

  // ---------- الصفحة الرئيسية ----------
  function renderHome() {
    session = null;
    app.innerHTML = '';

    var header = el('div', 'site-header');
    header.appendChild(el('h1', null, '🚗 اختبار القيادة النظري'));
    header.appendChild(el('p', 'sub', 'أهلًا ' + esc(user.name) + ' 👋 — ' + allQuestions.length + ' سؤالًا في ' + QUIZ_UNITS.length + ' وحدات' + (syncFailed ? ' <span class="sync-warn">(بلا اتصال — سيُزامن تقدمك عند عودة الإنترنت)</span>' : '')));
    var switchLink = el('button', 'switch-user', 'تسجيل الخروج ⎋');
    switchLink.addEventListener('click', logout);
    header.appendChild(switchLink);
    app.appendChild(header);

    // الجلسات غير المكتملة (كلها تبقى محفوظة، ويمكن بدء جلسات جديدة بجانبها)
    var savedList = validSavedSessions();
    if (savedList.length) {
      var resumeCard = el('div', 'card resume-card-multi');
      resumeCard.appendChild(el('div', 'resume-title', '⏯ جلساتك غير المكتملة (' + savedList.length + ')'));
      savedList.forEach(function (saved) {
        var answeredCount = Object.keys(saved.answers || {}).length;
        var row = el('div', 'resume-row');
        var rInfo = el('div', 'resume-info');
        rInfo.appendChild(el('div', 'resume-row-title', esc(saved.title)));
        rInfo.appendChild(el('div', 'resume-meta', 'أجبتِ عن ' + answeredCount + ' من ' + saved.ids.length + ' — توقفتِ عند سؤال ' + (Math.min(saved.i, saved.ids.length - 1) + 1)));
        row.appendChild(rInfo);
        var rActions = el('div', 'resume-actions');
        var resumeBtn = el('button', 'btn btn-primary btn-sm', 'متابعة');
        resumeBtn.addEventListener('click', function () { resumeSession(saved); });
        var dismissBtn = el('button', 'btn btn-soft btn-sm', '🗑');
        dismissBtn.title = 'حذف هذه الجلسة';
        dismissBtn.addEventListener('click', function () { removeSavedSession(saved.sid); renderHome(); });
        rActions.appendChild(resumeBtn);
        rActions.appendChild(dismissBtn);
        row.appendChild(rActions);
        resumeCard.appendChild(row);
      });
      app.appendChild(resumeCard);
    }

    // خيار الخلط
    var optRow = el('div', 'options-row');
    var shuffleLbl = el('label');
    var shuffleCb = document.createElement('input');
    shuffleCb.type = 'checkbox';
    shuffleCb.checked = shufflePref;
    shuffleCb.addEventListener('change', function () { shufflePref = shuffleCb.checked; persist(); });
    shuffleLbl.appendChild(shuffleCb);
    shuffleLbl.appendChild(document.createTextNode('خلط ترتيب الأسئلة'));
    optRow.appendChild(shuffleLbl);
    app.appendChild(optRow);

    // بطاقات الأوضاع
    var grid = el('div', 'mode-cards');

    var fullCard = el('div', 'card clickable mode-card');
    fullCard.appendChild(el('div', 'icon', '📝'));
    fullCard.appendChild(el('div', 'name', 'الاختبار الشامل'));
    fullCard.appendChild(el('div', 'desc', 'جميع أسئلة الوحدات الثماني في اختبار واحد'));
    fullCard.appendChild(el('span', 'count', allQuestions.length + ' سؤال'));
    fullCard.addEventListener('click', function () {
      startSession(allQuestions, 'all', 'الاختبار الشامل', shuffleCb.checked);
    });
    grid.appendChild(fullCard);

    var wrongList = Array.from(wrongPool).map(function (id) { return byId[id]; }).filter(Boolean);
    var wrongCard = el('div', 'card mode-card' + (wrongList.length ? ' clickable' : ' dim'));
    wrongCard.appendChild(el('div', 'icon', '🔁'));
    wrongCard.appendChild(el('div', 'name', 'إعادة الأخطاء'));
    wrongCard.appendChild(el('div', 'desc', wrongList.length ? 'الأسئلة التي أخفقتِ فيها ولم تصححيها بعد' : 'لا توجد أخطاء محفوظة — أحسنتِ!'));
    wrongCard.appendChild(el('span', 'count', wrongList.length + ' سؤال'));
    if (wrongList.length) {
      wrongCard.addEventListener('click', function () {
        startSession(wrongList, 'wrong', 'إعادة الأخطاء', shuffleCb.checked);
      });
    }
    grid.appendChild(wrongCard);

    var flaggedList = Array.from(flags).map(function (id) { return byId[id]; }).filter(Boolean);
    var flagCard = el('div', 'card mode-card' + (flaggedList.length ? ' clickable' : ' dim'));
    flagCard.appendChild(el('div', 'icon', '🚩'));
    flagCard.appendChild(el('div', 'name', 'أسئلة المراجعة'));
    flagCard.appendChild(el('div', 'desc', flaggedList.length ? 'الأسئلة التي وضعتِ عليها علامة مراجعة' : 'لم تضعي علامة مراجعة على أي سؤال بعد'));
    flagCard.appendChild(el('span', 'count', flaggedList.length + ' سؤال'));
    if (flaggedList.length) {
      flagCard.addEventListener('click', function () {
        startSession(flaggedList, 'flagged', 'أسئلة المراجعة', shuffleCb.checked);
      });
    }
    grid.appendChild(flagCard);

    var mixCard = el('div', 'card clickable mode-card');
    mixCard.appendChild(el('div', 'icon', '🎲'));
    mixCard.appendChild(el('div', 'name', 'اختبار سريع'));
    mixCard.appendChild(el('div', 'desc', '30 سؤالًا عشوائيًا من كل الوحدات — بعدد أسئلة الاختبار الفعلي'));
    mixCard.appendChild(el('span', 'count', '30 سؤال'));
    mixCard.addEventListener('click', function () {
      startSession(shuffle(allQuestions).slice(0, 30), 'quick', 'اختبار سريع', false);
    });
    grid.appendChild(mixCard);

    var vioModeCard = el('div', 'card clickable mode-card');
    vioModeCard.appendChild(el('div', 'icon', '⚠️'));
    vioModeCard.appendChild(el('div', 'name', 'جدول النقاط للمخالفات'));
    vioModeCard.appendChild(el('div', 'desc', 'نقاط المخالفات المرورية مرتبة من الأشد إلى الأخف'));
    vioModeCard.appendChild(el('span', 'count', VIOLATIONS.length + ' مخالفة'));
    vioModeCard.addEventListener('click', renderViolations);
    grid.appendChild(vioModeCard);

    if (extraQuestions.length) {
      var extraCard = el('div', 'card clickable mode-card');
      extraCard.appendChild(el('div', 'icon', '🟡'));
      extraCard.appendChild(el('div', 'name', 'أسئلة إضافية من البرنامج الأصفر'));
      extraCard.appendChild(el('div', 'desc', 'أسئلة من تطبيق امتحان رخصة القيادة لم ترد في ملف النزاوي'));
      extraCard.appendChild(el('span', 'count', extraQuestions.length + ' سؤالًا'));
      extraCard.addEventListener('click', function () {
        startSession(extraQuestions, 'extra', 'أسئلة إضافية من البرنامج الأصفر', shuffleCb.checked);
      });
      grid.appendChild(extraCard);
    }

    app.appendChild(grid);

    // الوحدات (مع ملخص كل وحدة داخل بطاقتها)
    app.appendChild(el('div', 'section-label', 'التدرب حسب الوحدة'));
    var list = el('div', 'unit-list');
    QUIZ_UNITS.forEach(function (u) {
      var card = el('div', 'card unit-card');

      var row = el('div', 'unit-row clickable-row');
      row.appendChild(el('div', 'unum', u.num));
      var info = el('div', 'uinfo');
      info.appendChild(el('div', 'uname', u.full));
      info.appendChild(el('div', 'umeta', u.questions.length + ' سؤالًا'));
      row.appendChild(info);
      var b = best['unit' + u.num];
      if (b) row.appendChild(el('div', 'ubest', 'أفضل نتيجة: ' + b.score + '/' + b.total));
      row.addEventListener('click', function () {
        startSession(u.questions, 'unit' + u.num, u.full, shuffleCb.checked);
      });
      card.appendChild(row);

      var s = UNIT_SUMMARIES[u.num - 1];
      if (s) {
        var toggle = el('button', 'sum-toggle', '📋 ملخص الوحدة ▾');
        var pointsWrap = el('ul', 'sum-points');
        pointsWrap.style.display = 'none';
        s.pts.forEach(function (p) { pointsWrap.appendChild(el('li', null, p)); });
        toggle.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var open = pointsWrap.style.display !== 'none';
          pointsWrap.style.display = open ? 'none' : '';
          toggle.innerHTML = open ? '📋 ملخص الوحدة ▾' : '📋 إخفاء الملخص ▴';
          toggle.classList.toggle('open', !open);
        });
        card.appendChild(toggle);
        card.appendChild(pointsWrap);
      }
      list.appendChild(card);
    });
    app.appendChild(list);

    var footer = el('footer', 'site-footer', 'جميع الأسئلة منقولة من كتاب النزاوي لتعليم القيادة لأغراض التدريب الشخصي');
    app.appendChild(footer);
  }

  // ---------- صفحة جدول النقاط للمخالفات ----------
  function renderViolations() {
    session = null;
    app.innerHTML = '';

    var bar = el('div', 'topbar');
    var backBtn = el('button', 'btn btn-soft btn-sm', 'الرئيسية ⌂');
    backBtn.addEventListener('click', renderHome);
    bar.appendChild(backBtn);
    bar.appendChild(el('div', 'title', '⚠️ جدول النقاط للمخالفات المرورية'));
    app.appendChild(bar);

    var card = el('div', 'card vio-page-card');
    var tbl = el('table', 'vio-table');
    tbl.innerHTML = '<thead><tr><th>م</th><th>مسمى المخالفة</th><th>النقاط</th></tr></thead>';
    var tbody = document.createElement('tbody');
    VIOLATIONS.forEach(function (v, i) {
      var tr = document.createElement('tr');
      var sev = v[1] >= 24 ? '24' : v[1] >= 12 ? '12' : v[1] >= 8 ? '8' : v[1] >= 6 ? '6' : v[1] >= 4 ? '4' : '2';
      tr.className = 'row-' + sev;
      var name = esc(v[0]) + (v[2] ? ' <span class="vio-star">*</span>' : '');
      tr.innerHTML = '<td>' + (i + 1) + '</td><td>' + name + '</td><td><span class="vio-pts sev-' + sev + '">' + v[1] + '</span></td>';
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    card.appendChild(tbl);
    card.appendChild(el('div', 'vio-note', '<b class="vio-star">*</b> مخالفة وردت في أسئلة الاختبار (ملف النزاوي أو البرنامج الأصفر) — ركزي على حفظ نقاطها.'));
    card.appendChild(el('div', 'vio-note', 'المصدر: الإدارة العامة للمرور — تُحتسب النقاط عند ارتكاب المخالفة، وتراكمها يؤدي إلى سحب الرخصة.'));
    app.appendChild(card);
    window.scrollTo(0, 0);
  }

  // ---------- عرض السؤال ----------
  function renderQuestion() {
    var q = session.questions[session.i];
    var answered = session.answers.hasOwnProperty(q.id);
    persistSession();
    app.innerHTML = '';

    // الشريط العلوي مع شريطي التقدم (بحسب الاكتمال لا الموضع)
    var bar = el('div', 'topbar');
    var backBtn = el('button', 'btn btn-soft btn-sm', 'الرئيسية ⌂');
    backBtn.addEventListener('click', function () { renderHome(); });
    bar.appendChild(backBtn);

    function answeredIn(list) {
      var n = 0;
      list.forEach(function (x) { if (session.answers.hasOwnProperty(x.id)) n++; });
      return n;
    }

    function progRow(label, cur, total) {
      var row = el('div', 'prog-row');
      row.appendChild(el('span', 'prog-label', label));
      var pw = el('div', 'progress-wrap');
      var pb = el('div', 'progress-bar');
      pb.style.width = Math.round((cur / total) * 100) + '%';
      pw.appendChild(pb);
      row.appendChild(pw);
      row.appendChild(el('span', 'progress-text', cur + ' / ' + total));
      return row;
    }

    var progBlock = el('div', 'progress-block');
    if (session.mode === 'all') {
      var unitQs = session.questions.filter(function (x) { return x.unit === q.unit; });
      progBlock.appendChild(progRow('الوحدة ' + ORDINALS[q.unit - 1], answeredIn(unitQs), unitQs.length));
      progBlock.appendChild(progRow('الاختبار الكامل', answeredIn(session.questions), session.questions.length));
    } else if (session.mode.indexOf('unit') === 0) {
      progBlock.appendChild(progRow('الوحدة ' + ORDINALS[q.unit - 1], answeredIn(session.questions), session.questions.length));
    } else {
      progBlock.appendChild(progRow(session.title, answeredIn(session.questions), session.questions.length));
    }
    bar.appendChild(progBlock);
    app.appendChild(bar);

    // شريط التنقل بين الوحدات
    var showChips = session.mode === 'all' || session.mode.indexOf('unit') === 0;
    if (showChips) {
      var chips = el('div', 'unit-chips');
      QUIZ_UNITS.forEach(function (u) {
        var isCurrent = q.unit === u.num;
        var chipText = ORDINALS[u.num - 1];
        var chipCls = 'unit-chip' + (isCurrent ? ' current' : '');
        if (session.mode === 'all') {
          var uqs = session.questions.filter(function (x) { return x.unit === u.num; });
          var uDone = uqs.every(function (x) { return session.answers.hasOwnProperty(x.id); });
          if (uDone) { chipText += ' ✓'; chipCls += ' done'; }
        }
        var chip = el('button', chipCls, chipText);
        chip.title = u.full + ' (' + u.questions.length + ' سؤالًا)';
        chip.addEventListener('click', function () {
          if (session.mode === 'all') {
            for (var k = 0; k < session.questions.length; k++) {
              if (session.questions[k].unit === u.num) {
                session.i = k;
                renderQuestion();
                window.scrollTo(0, 0);
                return;
              }
            }
          } else if (!isCurrent) {
            startSession(u.questions, 'unit' + u.num, u.full, session.shuffled);
          }
        });
        chips.appendChild(chip);
      });
      app.appendChild(chips);
    }

    // بطاقة السؤال
    var card = el('div', 'card q-card');
    var head = el('div', 'q-head');
    head.appendChild(el('div', 'q-num', session.i + 1));
    var qt = el('div', 'q-text');
    qt.innerHTML = esc(q.q) + '<span class="q-unit-tag">' + esc(q.unitTitle) + ' — سؤال ' + q.n + '</span>';
    head.appendChild(qt);

    var flagBtn = el('button', 'flag-btn' + (flags.has(q.id) ? ' flagged' : ''), flags.has(q.id) ? '🚩' : '⚐');
    flagBtn.title = 'علامة مراجعة — يبقى السؤال في قائمة المراجعة لإعادة التدرب عليه';
    flagBtn.addEventListener('click', function () {
      if (flags.has(q.id)) { flags.delete(q.id); flagBtn.classList.remove('flagged'); flagBtn.innerHTML = '⚐'; }
      else { flags.add(q.id); flagBtn.classList.add('flagged'); flagBtn.innerHTML = '🚩'; }
      persist();
    });
    head.appendChild(flagBtn);
    card.appendChild(head);

    // صور السؤال
    if (q.figs && q.figs.length) {
      var figs = el('div', 'q-figs');
      q.figs.forEach(function (f) {
        var img = document.createElement('img');
        img.src = f;
        img.alt = 'صورة توضيحية للسؤال';
        img.loading = 'lazy';
        figs.appendChild(img);
      });
      card.appendChild(figs);
    }

    // الخيارات
    var optsWrap = el('div', 'opts');
    q.opts.forEach(function (optText, idx) {
      var btn = el('button', 'opt');
      btn.type = 'button';
      var letter = el('span', 'letter', LETTERS[idx]);
      btn.appendChild(letter);
      var body = el('div', 'opt-body');
      if (q.optImgs && q.optImgs[idx]) {
        var oi = document.createElement('img');
        oi.src = q.optImgs[idx];
        oi.alt = 'الخيار ' + LETTERS[idx];
        body.appendChild(oi);
        if (optText) body.appendChild(el('div', null, esc(optText)));
      } else {
        body.innerHTML = esc(optText);
      }
      btn.appendChild(body);
      btn.addEventListener('click', function () { answer(q, idx); });
      optsWrap.appendChild(btn);
    });
    card.appendChild(optsWrap);
    app.appendChild(card);

    // التنقل
    var nav = el('div', 'quiz-nav');
    var prevBtn = el('button', 'btn btn-soft nav-prev', 'السؤال السابق →');
    prevBtn.disabled = session.i === 0;
    prevBtn.addEventListener('click', function () {
      if (session.i > 0) { session.i--; renderQuestion(); window.scrollTo(0, 0); }
    });
    var nextLabel;
    if (session.i + 1 < session.questions.length) {
      nextLabel = 'تخطي السؤال ←';
    } else {
      var rem0 = remainingCount();
      nextLabel = rem0 > 0 ? 'إلى الأسئلة المتبقية (' + rem0 + ') ↻' : 'عرض النتيجة 🏁';
    }
    var nextBtn = el('button', 'btn btn-ghost nav-next', nextLabel);
    nextBtn.addEventListener('click', function () { next(); });
    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    app.appendChild(nav);

    if (answered) showFeedback(q, session.answers[q.id]);
  }

  // ---------- الإجابة ----------
  function answer(q, idx) {
    if (session.answers.hasOwnProperty(q.id)) return;
    session.answers[q.id] = idx;
    var ok = isCorrectChoice(q, idx);
    if (ok) {
      if (wrongPool.has(q.id)) wrongPool.delete(q.id);
    } else {
      wrongPool.add(q.id);
    }
    persistSession();
    // تحديث شريطي التقدم فورًا
    showFeedback(q, idx);
    refreshProgress();
  }

  function refreshProgress() {
    var q = session.questions[session.i];
    var rows = app.querySelectorAll('.prog-row');
    function upd(row, cur, total) {
      row.querySelector('.progress-bar').style.width = Math.round((cur / total) * 100) + '%';
      row.querySelector('.progress-text').textContent = cur + ' / ' + total;
    }
    function answeredIn(list) {
      var n = 0;
      list.forEach(function (x) { if (session.answers.hasOwnProperty(x.id)) n++; });
      return n;
    }
    if (session.mode === 'all' && rows.length >= 2) {
      var unitQs = session.questions.filter(function (x) { return x.unit === q.unit; });
      upd(rows[0], answeredIn(unitQs), unitQs.length);
      upd(rows[1], answeredIn(session.questions), session.questions.length);
    } else if (rows.length >= 1) {
      upd(rows[0], answeredIn(session.questions), session.questions.length);
    }
  }

  function showFeedback(q, chosenIdx) {
    var ok = isCorrectChoice(q, chosenIdx);
    var opts = app.querySelectorAll('.opt');
    opts.forEach(function (btn, idx) {
      btn.disabled = true;
      if (isCorrectChoice(q, idx)) btn.classList.add('correct');
      else if (idx === chosenIdx) btn.classList.add('wrong');
      else btn.classList.add('faded');
    });

    var fb = el('div', 'feedback ' + (ok ? 'ok' : 'bad'));
    fb.appendChild(el('div', 'verdict', ok ? '✅ إجابة صحيحة' : '❌ إجابة خاطئة'));
    var whyHtml = '';
    if (!ok) whyHtml += '<b>الإجابة الصحيحة: ' + LETTERS[q.correct] + '.</b> ' + esc(stripImgOptText(q, q.correct)) + '<br>';
    whyHtml += '<b>لماذا؟</b> ' + esc(q.why);
    fb.appendChild(el('div', 'why', whyHtml));
    var qCard = app.querySelector('.q-card');
    qCard.appendChild(fb);

    var nav = app.querySelector('.quiz-nav');
    var nextBtn = nav.querySelector('.nav-next');
    nextBtn.className = 'btn btn-primary nav-next';
    if (session.i + 1 < session.questions.length) {
      nextBtn.innerHTML = 'السؤال التالي ←';
    } else {
      var rem = remainingCount();
      nextBtn.innerHTML = rem > 0 ? 'إلى الأسئلة المتبقية (' + rem + ') ↻' : 'عرض النتيجة 🏁';
    }
    if (!ok && !nav.querySelector('.wrong-note')) {
      nav.appendChild(el('span', 'progress-text wrong-note', 'أُضيف السؤال لقائمة «إعادة الأخطاء»'));
    }
    nextBtn.focus();
  }

  function stripImgOptText(q, idx) {
    var t = q.opts[idx];
    if (t) return t;
    if (q.optImgs && q.optImgs[idx]) return '(الخيار المصوّر ' + LETTERS[idx] + ')';
    return '';
  }

  function remainingCount() {
    var n = 0;
    session.questions.forEach(function (x) { if (!session.answers.hasOwnProperty(x.id)) n++; });
    return n;
  }

  function firstUnansweredIndex() {
    for (var k = 0; k < session.questions.length; k++) {
      if (!session.answers.hasOwnProperty(session.questions[k].id)) return k;
    }
    return -1;
  }

  function next() {
    if (session.i + 1 < session.questions.length) {
      session.i++;
      renderQuestion();
      window.scrollTo(0, 0);
    } else {
      // آخر سؤال: لا نتيجة قبل إجابة كل الأسئلة — نعود لأول سؤال غير مُجاب
      var idx = firstUnansweredIndex();
      if (idx !== -1) {
        session.i = idx;
        renderQuestion();
        window.scrollTo(0, 0);
      } else {
        renderSummary();
        window.scrollTo(0, 0);
      }
    }
  }

  // ---------- النتيجة ----------
  function renderSummary() {
    var qs = session.questions;
    var score = 0, wrongQs = [], skipped = 0;
    qs.forEach(function (q) {
      if (!session.answers.hasOwnProperty(q.id)) { skipped++; wrongQs.push(q); return; }
      if (isCorrectChoice(q, session.answers[q.id])) score++;
      else wrongQs.push(q);
    });
    var total = qs.length;
    var pct = Math.round((score / total) * 100);

    var prev = best[session.mode];
    if (!prev || score / total > prev.score / prev.total) {
      best[session.mode] = { score: score, total: total };
    }
    // اكتملت الجلسة — تُحذف من قائمة الجلسات غير المكتملة
    savedSessions = savedSessions.filter(function (s) { return s.sid !== session.sid; });
    persist();

    app.innerHTML = '';
    var bar = el('div', 'topbar');
    bar.appendChild(el('div', 'title', session.title + ' — النتيجة'));
    app.appendChild(bar);

    var card = el('div', 'card summary');
    var cls = pct >= 85 ? 'good' : pct >= 60 ? 'mid' : 'bad';
    card.appendChild(el('div', 'score-ring ' + cls, pct + '٪'));
    card.appendChild(el('div', 'verdict-line',
      pct >= 85 ? '🎉 ممتاز! أداء يقترب من الجاهزية للاختبار' :
      pct >= 60 ? '👍 جيد — راجعي الأخطاء وأعيدي المحاولة' :
      '💪 تحتاجين مزيدًا من التدريب — لا بأس، الإعادة تصنع الإتقان'));
    card.appendChild(el('div', 'detail',
      'أجبتِ صح على ' + score + ' من ' + total + ' سؤالًا' +
      (skipped ? ' (منها ' + skipped + ' تم تخطيها)' : '')));

    var actions = el('div', 'summary-actions');
    if (wrongQs.length) {
      var retryWrong = el('button', 'btn btn-red', '🔁 إعادة أسئلة هذه الجلسة الخاطئة فقط (' + wrongQs.length + ')');
      retryWrong.addEventListener('click', function () {
        startSession(wrongQs, session.mode, session.title + ' — إعادة الأخطاء', false);
      });
      actions.appendChild(retryWrong);
    }
    var retryAll = el('button', 'btn btn-primary', '↺ إعادة الاختبار بالكامل');
    var mode = session.mode, title = session.title, allQs = qs, wasShuffled = session.shuffled;
    retryAll.addEventListener('click', function () {
      var base = mode === 'all' ? allQuestions :
                 mode.indexOf('unit') === 0 ? QUIZ_UNITS[parseInt(mode.slice(4), 10) - 1].questions :
                 allQs;
      startSession(base, mode, title.replace(' — إعادة الأخطاء', ''), wasShuffled);
    });
    actions.appendChild(retryAll);
    var homeBtn = el('button', 'btn btn-soft', 'العودة إلى الرئيسية');
    homeBtn.addEventListener('click', renderHome);
    actions.appendChild(homeBtn);
    card.appendChild(actions);

    var list = el('div', 'review-list');
    list.appendChild(el('div', 'section-label', 'تفاصيل الجلسة'));
    qs.forEach(function (q, i) {
      var wasAnswered = session.answers.hasOwnProperty(q.id);
      var ok = wasAnswered && isCorrectChoice(q, session.answers[q.id]);
      var item = el('div', 'review-item');
      item.appendChild(el('span', 'mark ' + (ok ? 'ok' : 'bad'), ok ? '✔' : (wasAnswered ? '✘' : '—')));
      var label = (i + 1) + '. ' + q.q;
      if (flags.has(q.id)) label = '🚩 ' + label;
      item.appendChild(el('span', null, esc(label)));
      list.appendChild(item);
    });
    card.appendChild(list);
    app.appendChild(card);
  }

  // ---------- البداية ----------
  if (token) {
    bootData(false);
  } else {
    renderAuth(rawRead('user', null) ? 'login' : 'register');
  }
})();
