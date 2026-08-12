/* اختبار القيادة النظري — تطبيق تفاعلي على أسئلة النزاوي لتعليم القيادة
   حساب حقيقي + مزامنة سحابية + واجهة ثلاثية اللغات (عربي/إنجليزي/أردو) */
(function () {
  'use strict';

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

  // ---------- اللغات ----------
  var LANG = rawRead('lang', 'ar');
  if (['ar', 'en', 'ur'].indexOf(LANG) === -1) LANG = 'ar';

  var UI = {
    ar: {
      title: '🚗 اختبار القيادة النظري',
      authSub: 'حساب واحد يحفظ تقدمك ويتابعك على أي جهاز',
      login: 'تسجيل الدخول', register: 'حساب جديد',
      name: 'الاسم', namePh: 'مثال: ابتهال', email: 'البريد الإلكتروني', pass: 'كلمة المرور', passPh: '6 أحرف على الأقل',
      registerBtn: 'إنشاء الحساب والبدء 🚀', loginBtn: 'دخول', wait: '... لحظات',
      authNote: '🔒 كلمة المرور تُحفظ مشفرة، وتقدمك يُحفظ في حسابك ويظهر على أي جهاز تسجلين دخولك منه.',
      loading: '⏳ جارٍ تحميل تقدمك ...',
      greeting: 'أهلًا {name} 👋 — {n} سؤالًا في {u} وحدات',
      offline: '(بلا اتصال — سيُزامن تقدمك عند عودة الإنترنت)',
      logout: 'تسجيل الخروج ⎋',
      sessions: '⏯ جلساتك غير المكتملة ({n})',
      sessionMeta: 'أجبتِ عن {a} من {t} — توقفتِ عند سؤال {i}',
      resume: 'متابعة', deleteSession: 'حذف هذه الجلسة',
      shuffleOpt: 'خلط ترتيب الأسئلة',
      fullExam: 'الاختبار الشامل', fullExamDesc: 'جميع أسئلة الوحدات الثماني في اختبار واحد',
      qCount: '{n} سؤال', qCount2: '{n} سؤالًا',
      wrongCard: 'إعادة الأخطاء', wrongDescHas: 'الأسئلة التي أخفقتِ فيها ولم تصححيها بعد', wrongDescNone: 'لا توجد أخطاء محفوظة — أحسنتِ!',
      flagCard: 'أسئلة المراجعة', flagDescHas: 'الأسئلة التي وضعتِ عليها علامة مراجعة', flagDescNone: 'لم تضعي علامة مراجعة على أي سؤال بعد',
      quick: 'اختبار سريع', quickDesc: '30 سؤالًا عشوائيًا من كل الوحدات — بعدد أسئلة الاختبار الفعلي',
      vio: 'جدول النقاط للمخالفات', vioDesc: 'نقاط المخالفات المرورية مرتبة من الأشد إلى الأخف', vioCount: '{n} مخالفة',
      vioTitle: '⚠️ جدول النقاط للمخالفات المرورية',
      vioTh: ['م', 'مسمى المخالفة', 'النقاط'],
      vioStarNote: 'مخالفة وردت في أسئلة الاختبار (ملف النزاوي أو البرنامج الأصفر) — ركزي على حفظ نقاطها.',
      vioSrc: 'المصدر: الإدارة العامة للمرور — تُحتسب النقاط عند ارتكاب المخالفة، وتراكمها يؤدي إلى سحب الرخصة.',
      extra: 'أسئلة إضافية من البرنامج الأصفر', extraDesc: 'أسئلة من تطبيق امتحان رخصة القيادة لم ترد في ملف النزاوي',
      byUnit: 'التدرب حسب الوحدة',
      sumShow: '📋 ملخص الوحدة ▾', sumHide: '📋 إخفاء الملخص ▴',
      best: 'أفضل نتيجة: {s}/{t}',
      footer: 'جميع الأسئلة منقولة من كتاب النزاوي لتعليم القيادة لأغراض التدريب الشخصي',
      home: 'الرئيسية ⌂',
      unitProg: 'الوحدة {o}', fullProg: 'الاختبار الكامل',
      qTag: '{u} — سؤال {n}',
      flagTip: 'علامة مراجعة — يبقى السؤال في قائمة المراجعة لإعادة التدرب عليه',
      figAlt: 'صورة توضيحية للسؤال', optAlt: 'الخيار {L}', imgOpt: '(الخيار المصوّر {L})',
      prev: 'السؤال السابق →', skip: 'تخطي السؤال ←', next: 'السؤال التالي ←',
      remaining: 'إلى الأسئلة المتبقية ({n}) ↻', showResult: 'عرض النتيجة 🏁',
      correct: '✅ إجابة صحيحة', wrong: '❌ إجابة خاطئة',
      correctIs: 'الإجابة الصحيحة: {L}.', why: 'لماذا؟',
      addedWrong: 'أُضيف السؤال لقائمة «إعادة الأخطاء»',
      resultTitle: '{t} — النتيجة',
      vGreat: '🎉 ممتاز! أداء يقترب من الجاهزية للاختبار',
      vGood: '👍 جيد — راجعي الأخطاء وأعيدي المحاولة',
      vWeak: '💪 تحتاجين مزيدًا من التدريب — لا بأس، الإعادة تصنع الإتقان',
      scoreLine: 'أجبتِ صح على {s} من {t} سؤالًا', skippedNote: ' (منها {n} تم تخطيها)',
      retryWrong: '🔁 إعادة أسئلة هذه الجلسة الخاطئة فقط ({n})',
      retryAll: '↺ إعادة الاختبار بالكامل', backHome: 'العودة إلى الرئيسية',
      details: 'تفاصيل الجلسة', retryTag: ' — إعادة الأخطاء',
      errs: {
        email_exists: 'هذا البريد مسجل مسبقًا — جربي تسجيل الدخول',
        bad_credentials: 'البريد أو كلمة المرور غير صحيحة',
        weak_password: 'كلمة المرور يجب ألا تقل عن 6 أحرف',
        bad_email: 'فضلًا أدخلي بريدًا إلكترونيًا صحيحًا',
        name_required: 'فضلًا أدخلي الاسم',
        too_many_attempts: 'محاولات كثيرة — انتظري قليلًا ثم أعيدي المحاولة',
        server_error: 'خطأ في الخادم — أعيدي المحاولة',
        network: 'تعذر الاتصال — تحققي من الإنترنت وأعيدي المحاولة'
      },
      ordinals: ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة'],
      letters: ['أ', 'ب', 'ج', 'د'],
      arNote: ''
    },
    en: {
      title: '🚗 Driving Theory Test',
      authSub: 'One account saves your progress and follows you on any device',
      login: 'Sign in', register: 'New account',
      name: 'Name', namePh: 'e.g. Ibtihal', email: 'Email', pass: 'Password', passPh: 'At least 6 characters',
      registerBtn: 'Create account & start 🚀', loginBtn: 'Sign in', wait: '... one moment',
      authNote: '🔒 Your password is stored encrypted, and your progress is saved to your account on any device.',
      loading: '⏳ Loading your progress ...',
      greeting: 'Hello {name} 👋 — {n} questions in {u} units',
      offline: '(offline — progress will sync when back online)',
      logout: 'Sign out ⎋',
      sessions: '⏯ Your unfinished sessions ({n})',
      sessionMeta: 'Answered {a} of {t} — stopped at question {i}',
      resume: 'Resume', deleteSession: 'Delete this session',
      shuffleOpt: 'Shuffle questions',
      fullExam: 'Full exam', fullExamDesc: 'All questions of the eight units in one test',
      qCount: '{n} questions', qCount2: '{n} questions',
      wrongCard: 'Retry mistakes', wrongDescHas: 'Questions you got wrong and have not corrected yet', wrongDescNone: 'No saved mistakes — well done!',
      flagCard: 'Flagged questions', flagDescHas: 'Questions you flagged for review', flagDescNone: 'You have not flagged any question yet',
      quick: 'Quick test', quickDesc: '30 random questions from all units — same count as the real exam',
      vio: 'Violation points table', vioDesc: 'Traffic violation points from most to least severe', vioCount: '{n} violations',
      vioTitle: '⚠️ Traffic violation points table',
      vioTh: ['#', 'Violation (Arabic)', 'Points'],
      vioStarNote: 'Violation that appeared in exam questions (Nizawi file or the yellow app) — memorize its points.',
      vioSrc: 'Source: General Traffic Department — points accumulate and may lead to license suspension.',
      extra: 'Extra questions (yellow app)', extraDesc: 'Questions from the license exam app not found in the Nizawi file',
      byUnit: 'Practice by unit',
      sumShow: '📋 Unit summary (Arabic) ▾', sumHide: '📋 Hide summary ▴',
      best: 'Best score: {s}/{t}',
      footer: 'All questions transcribed from the Nizawi driving book for personal training',
      home: '⌂ Home',
      unitProg: 'Unit {o}', fullProg: 'Full exam',
      qTag: '{u} — question {n}',
      flagTip: 'Review flag — the question stays in your review list',
      figAlt: 'Question illustration', optAlt: 'Option {L}', imgOpt: '(pictured option {L})',
      prev: '← Previous', skip: 'Skip →', next: 'Next →',
      remaining: 'Go to remaining ({n}) ↻', showResult: 'Show result 🏁',
      correct: '✅ Correct answer', wrong: '❌ Wrong answer',
      correctIs: 'Correct answer: {L}.', why: 'Why?',
      addedWrong: 'Added to your "Retry mistakes" list',
      resultTitle: '{t} — Result',
      vGreat: '🎉 Excellent! You are close to exam-ready',
      vGood: '👍 Good — review your mistakes and try again',
      vWeak: '💪 You need more practice — repetition builds mastery',
      scoreLine: 'You answered {s} of {t} correctly', skippedNote: ' ({n} skipped)',
      retryWrong: '🔁 Retry only this session’s wrong answers ({n})',
      retryAll: '↺ Retake the whole test', backHome: 'Back to home',
      details: 'Session details', retryTag: ' — retry mistakes',
      errs: {
        email_exists: 'This email is already registered — try signing in',
        bad_credentials: 'Incorrect email or password',
        weak_password: 'Password must be at least 6 characters',
        bad_email: 'Please enter a valid email',
        name_required: 'Please enter your name',
        too_many_attempts: 'Too many attempts — wait a bit and retry',
        server_error: 'Server error — please retry',
        network: 'Connection failed — check your internet and retry'
      },
      ordinals: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'],
      letters: ['A', 'B', 'C', 'D'],
      unitTitles: ['Unit 1 – Introduction', 'Unit 2 – Traffic zone', 'Unit 3 – Behavior', 'Unit 4 – Traffic flow', 'Unit 5 – Crossings', 'Unit 6 – Driving speed', 'Unit 7 – Overtaking', 'Unit 8 – General conduct'],
      arNote: 'Unit summaries and the violations table are available in Arabic.'
    },
    ur: {
      title: '🚗 ڈرائیونگ تھیوری ٹیسٹ',
      authSub: 'ایک اکاؤنٹ آپ کی پیشرفت محفوظ رکھتا ہے اور ہر ڈیوائس پر ساتھ چلتا ہے',
      login: 'سائن ان', register: 'نیا اکاؤنٹ',
      name: 'نام', namePh: 'مثلاً: ابتہال', email: 'ای میل', pass: 'پاس ورڈ', passPh: 'کم از کم 6 حروف',
      registerBtn: 'اکاؤنٹ بنائیں اور شروع کریں 🚀', loginBtn: 'داخل ہوں', wait: '... ایک لمحہ',
      authNote: '🔒 پاس ورڈ خفیہ (انکرپٹڈ) محفوظ ہوتا ہے، اور آپ کی پیشرفت ہر ڈیوائس پر آپ کے اکاؤنٹ میں رہتی ہے۔',
      loading: '⏳ آپ کی پیشرفت لوڈ ہو رہی ہے ...',
      greeting: 'خوش آمدید {name} 👋 — {u} یونٹس میں {n} سوالات',
      offline: '(آف لائن — انٹرنیٹ آنے پر پیشرفت سنک ہوگی)',
      logout: 'سائن آؤٹ ⎋',
      sessions: '⏯ آپ کے نامکمل سیشن ({n})',
      sessionMeta: '{t} میں سے {a} کے جواب دیے — سوال {i} پر رکیں',
      resume: 'جاری رکھیں', deleteSession: 'یہ سیشن حذف کریں',
      shuffleOpt: 'سوالات کی ترتیب بدلیں',
      fullExam: 'مکمل امتحان', fullExamDesc: 'آٹھوں یونٹس کے تمام سوالات ایک ٹیسٹ میں',
      qCount: '{n} سوالات', qCount2: '{n} سوالات',
      wrongCard: 'غلطیوں کا اعادہ', wrongDescHas: 'وہ سوالات جن میں غلطی ہوئی اور ابھی درست نہیں کیے', wrongDescNone: 'کوئی محفوظ غلطی نہیں — شاباش!',
      flagCard: 'نظرثانی کے سوالات', flagDescHas: 'وہ سوالات جن پر آپ نے جھنڈا لگایا', flagDescNone: 'ابھی کسی سوال پر جھنڈا نہیں لگایا',
      quick: 'فوری ٹیسٹ', quickDesc: 'تمام یونٹس سے 30 بے ترتیب سوالات — اصل امتحان جتنے',
      vio: 'خلاف ورزی پوائنٹس ٹیبل', vioDesc: 'ٹریفک خلاف ورزیوں کے پوائنٹس، شدید سے ہلکی تک', vioCount: '{n} خلاف ورزیاں',
      vioTitle: '⚠️ ٹریفک خلاف ورزیوں کے پوائنٹس کا ٹیبل',
      vioTh: ['#', 'خلاف ورزی (عربی)', 'پوائنٹس'],
      vioStarNote: 'وہ خلاف ورزی جو امتحانی سوالات میں آئی (النزاوی فائل یا پیلی ایپ) — اس کے پوائنٹس یاد رکھیں۔',
      vioSrc: 'ماخذ: جنرل ٹریفک ڈیپارٹمنٹ — پوائنٹس جمع ہونے پر لائسنس معطل ہو سکتا ہے۔',
      extra: 'پیلی ایپ کے اضافی سوالات', extraDesc: 'لائسنس امتحان ایپ کے وہ سوالات جو النزاوی فائل میں نہیں',
      byUnit: 'یونٹ کے لحاظ سے مشق',
      sumShow: '📋 یونٹ کا خلاصہ (عربی) ▾', sumHide: '📋 خلاصہ چھپائیں ▴',
      best: 'بہترین نتیجہ: {s}/{t}',
      footer: 'تمام سوالات ذاتی مشق کے لیے النزاوی ڈرائیونگ کتاب سے نقل کیے گئے ہیں',
      home: 'مرکزی صفحہ ⌂',
      unitProg: 'یونٹ {o}', fullProg: 'مکمل امتحان',
      qTag: '{u} — سوال {n}',
      flagTip: 'نظرثانی کا جھنڈا — سوال آپ کی نظرثانی فہرست میں رہتا ہے',
      figAlt: 'سوال کی وضاحتی تصویر', optAlt: 'اختیار {L}', imgOpt: '(تصویری اختیار {L})',
      prev: 'پچھلا سوال →', skip: 'سوال چھوڑیں ←', next: 'اگلا سوال ←',
      remaining: 'باقی سوالات کی طرف ({n}) ↻', showResult: 'نتیجہ دیکھیں 🏁',
      correct: '✅ درست جواب', wrong: '❌ غلط جواب',
      correctIs: 'درست جواب: {L}.', why: 'کیوں؟',
      addedWrong: 'سوال «غلطیوں کے اعادہ» کی فہرست میں شامل ہو گیا',
      resultTitle: '{t} — نتیجہ',
      vGreat: '🎉 بہترین! آپ امتحان کے لیے تقریباً تیار ہیں',
      vGood: '👍 اچھا — غلطیوں پر نظرثانی کر کے دوبارہ کوشش کریں',
      vWeak: '💪 مزید مشق درکار ہے — اعادہ ہی مہارت بناتا ہے',
      scoreLine: '{t} میں سے {s} کے درست جواب دیے', skippedNote: ' ({n} چھوڑے گئے)',
      retryWrong: '🔁 صرف اس سیشن کی غلطیوں کا اعادہ ({n})',
      retryAll: '↺ پورا ٹیسٹ دوبارہ دیں', backHome: 'مرکزی صفحے پر واپس',
      details: 'سیشن کی تفصیلات', retryTag: ' — غلطیوں کا اعادہ',
      errs: {
        email_exists: 'یہ ای میل پہلے سے رجسٹرڈ ہے — سائن ان آزمائیں',
        bad_credentials: 'ای میل یا پاس ورڈ غلط ہے',
        weak_password: 'پاس ورڈ کم از کم 6 حروف کا ہو',
        bad_email: 'براہ کرم درست ای میل درج کریں',
        name_required: 'براہ کرم نام درج کریں',
        too_many_attempts: 'بہت زیادہ کوششیں — تھوڑا انتظار کر کے دوبارہ کریں',
        server_error: 'سرور کی خرابی — دوبارہ کوشش کریں',
        network: 'رابطہ ناکام — انٹرنیٹ چیک کر کے دوبارہ کوشش کریں'
      },
      ordinals: ['پہلی', 'دوسری', 'تیسری', 'چوتھی', 'پانچویں', 'چھٹی', 'ساتویں', 'آٹھویں'],
      letters: ['أ', 'ب', 'ج', 'د'],
      unitTitles: ['یونٹ 1 – تعارف', 'یونٹ 2 – ٹریفک زون', 'یونٹ 3 – رویہ', 'یونٹ 4 – ٹریفک کی روانی', 'یونٹ 5 – کراسنگز', 'یونٹ 6 – ڈرائیونگ کی رفتار', 'یونٹ 7 – اوورٹیکنگ', 'یونٹ 8 – عمومی رویہ'],
      arNote: 'یونٹس کے خلاصے اور خلاف ورزی ٹیبل عربی میں دستیاب ہیں۔'
    }
  };

  function t(k) {
    var d = UI[LANG] || UI.ar;
    return (d[k] !== undefined) ? d[k] : UI.ar[k];
  }
  function tf(k, repl) {
    var s = t(k);
    Object.keys(repl || {}).forEach(function (key) {
      s = s.split('{' + key + '}').join(repl[key]);
    });
    return s;
  }
  function LETTERS() { return t('letters'); }
  function ORD(i) { return t('ordinals')[i]; }
  function unitFull(u) {
    if (LANG === 'ar') return u.full;
    return t('unitTitles')[u.num - 1] || u.full;
  }
  function applyDir() {
    document.documentElement.lang = LANG;
    document.documentElement.dir = (LANG === 'en') ? 'ltr' : 'rtl';
  }
  applyDir();

  // ترجمة الأسئلة: I18N[lang][id] = [نص السؤال, [الخيارات], الشرح]
  function trQ(q) {
    if (LANG === 'ar') return null;
    var d = (window.I18N && I18N[LANG]) ? I18N[LANG][q.id] : null;
    return d || null;
  }
  function qText(q) { var d = trQ(q); return d ? d[0] : q.q; }
  function qOpt(q, i) {
    var d = trQ(q);
    if (d && d[1] && d[1][i] !== undefined && d[1][i] !== '') return d[1][i];
    return q.opts[i];
  }
  function qWhy(q) { var d = trQ(q); return d ? d[2] : q.why; }
  function unitTitleOf(q) {
    if (LANG === 'ar') return q.unitTitle;
    if (q.unit === 0) return t('extra');
    return t('unitTitles')[q.unit - 1] || q.unitTitle;
  }

  // ---------- جلسة المستخدم (JWT) ----------
  var token = rawRead('token', null);
  var user = rawRead('user', null);

  function apiFetch(path, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (opts.body !== undefined) opts.headers['Content-Type'] = 'application/json';
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    return fetch('/api/' + path, opts);
  }

  // ---------- حالة التقدم ----------
  var flags = new Set();
  var wrongPool = new Set();
  var best = {};
  var shufflePref = false;
  var savedSessions = [];
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
      session: savedSessions[0] || null
    };
  }

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

  // ---------- ملخصات الوحدات (بالعربية) ----------
  var UNIT_SUMMARIES = [
    {
      t: 'الأولى — المقدمة (المسافات والقوانين)',
      pts: [
        'رخصة القيادة الخاصة: حتى <b>٩ أشخاص</b> بمن فيهم السائق، ومركبات نقل خاص حتى <b>٣٥٠٠ كغم</b>.',
        'زمن ردة الفعل ≈ <b>ثانية واحدة</b>، والمسافة المقطوعة في الثانية ≈ (السرعة ÷ ١٠) × ٣.',
        'مثالا الوحدة — المسافة المقطوعة في ثانية واحدة (وهي نفسها مسافة ردة الفعل تقريبًا): بسرعة <b>٦٠</b> كم/س (٦ × ٣) = <b>١٨ مترًا</b> | بسرعة <b>٣٠</b> كم/س (٣ × ٣) = <b>٩ أمتار</b>.',
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

  // ---------- حالة جلسة الاختبار ----------
  var session = null;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t2 = a[i]; a[i] = a[j]; a[j] = t2;
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

  function sessionTitle(mode, fallback) {
    if (mode === 'all') return t('fullExam');
    if (mode === 'wrong') return t('wrongCard');
    if (mode === 'flagged') return t('flagCard');
    if (mode === 'quick') return t('quick');
    if (mode === 'extra') return t('extra');
    if (mode && mode.indexOf('unit') === 0) {
      var n = parseInt(mode.slice(4), 10);
      if (n >= 1 && n <= 8) return unitFull(QUIZ_UNITS[n - 1]);
    }
    return fallback || '';
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

  // ---------- مبدّل اللغة ----------
  var currentView = 'auth'; // auth | home | quiz | summary | vio
  function setLang(l) {
    if (l === LANG) return;
    LANG = l;
    rawWrite('lang', l);
    applyDir();
    if (currentView === 'quiz' && session) renderQuestion();
    else if (currentView === 'vio') renderViolations();
    else if (token && user) renderHome();
    else renderAuth();
  }
  function langBar() {
    var bar = el('div', 'lang-bar');
    [['ar', 'العربية'], ['en', 'English'], ['ur', 'اردو']].forEach(function (p) {
      var b = el('button', 'lang-btn' + (LANG === p[0] ? ' active' : ''), p[1]);
      b.addEventListener('click', function () { setLang(p[0]); });
      bar.appendChild(b);
    });
    return bar;
  }

  // ---------- شاشة الدخول ----------
  function renderAuth(startTab) {
    currentView = 'auth';
    session = null;
    app.innerHTML = '';
    app.appendChild(langBar());

    var header = el('div', 'site-header');
    header.appendChild(el('h1', null, t('title')));
    header.appendChild(el('p', 'sub', t('authSub')));
    app.appendChild(header);

    var card = el('div', 'card register-card');

    var tabs = el('div', 'auth-tabs');
    var tabLogin = el('button', 'auth-tab', t('login'));
    var tabRegister = el('button', 'auth-tab', t('register'));
    tabs.appendChild(tabLogin);
    tabs.appendChild(tabRegister);
    card.appendChild(tabs);

    var form = el('form', 'register-form');
    card.appendChild(form);
    card.appendChild(el('p', 'register-note', t('authNote')));
    app.appendChild(card);

    var mode = startTab || (rawRead('user', null) ? 'login' : 'register');

    function build() {
      tabLogin.className = 'auth-tab' + (mode === 'login' ? ' active' : '');
      tabRegister.className = 'auth-tab' + (mode === 'register' ? ' active' : '');
      form.innerHTML = '';
      var nameInput = null;
      if (mode === 'register') {
        form.appendChild(el('label', 'field-label', t('name')));
        nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.className = 'field-input';
        nameInput.placeholder = t('namePh'); nameInput.maxLength = 60;
        form.appendChild(nameInput);
      }
      form.appendChild(el('label', 'field-label', t('email')));
      var emailInput = document.createElement('input');
      emailInput.type = 'email'; emailInput.className = 'field-input';
      emailInput.placeholder = 'name@example.com'; emailInput.autocomplete = 'email';
      form.appendChild(emailInput);
      form.appendChild(el('label', 'field-label', t('pass')));
      var passInput = document.createElement('input');
      passInput.type = 'password'; passInput.className = 'field-input';
      passInput.placeholder = mode === 'register' ? t('passPh') : '';
      passInput.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
      form.appendChild(passInput);
      var err = el('div', 'field-error');
      form.appendChild(err);
      var submit = el('button', 'btn btn-primary register-btn', mode === 'register' ? t('registerBtn') : t('loginBtn'));
      submit.type = 'submit';
      form.appendChild(submit);

      form.onsubmit = function (ev) {
        ev.preventDefault();
        err.textContent = '';
        submit.disabled = true;
        submit.textContent = t('wait');
        var payload = { email: emailInput.value.trim(), password: passInput.value };
        if (mode === 'register') payload.name = nameInput.value.trim();
        apiFetch(mode === 'register' ? 'register' : 'login', {
          method: 'POST',
          body: JSON.stringify(payload)
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (!res.ok) {
              err.textContent = t('errs')[res.j.error] || t('errs').server_error;
              submit.disabled = false;
              submit.textContent = mode === 'register' ? t('registerBtn') : t('loginBtn');
              return;
            }
            token = res.j.token;
            user = { name: res.j.name, email: res.j.email };
            rawWrite('token', token);
            rawWrite('user', user);
            bootData(mode === 'register');
          })
          .catch(function () {
            err.textContent = t('errs').network;
            submit.disabled = false;
            submit.textContent = mode === 'register' ? t('registerBtn') : t('loginBtn');
          });
      };
    }

    tabLogin.addEventListener('click', function () { mode = 'login'; build(); });
    tabRegister.addEventListener('click', function () { mode = 'register'; build(); });
    build();
  }

  function bootData(isNewAccount) {
    app.innerHTML = '';
    app.appendChild(langBar());
    var loading = el('div', 'card register-card', '<div class="loading-msg">' + t('loading') + '</div>');
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
          var local = rawRead(cacheKey(), null) || legacyData();
          hydrate(local);
          if (local) pushToServer();
        }
        renderHome();
      })
      .catch(function () {
        hydrate(rawRead(cacheKey(), null));
        syncFailed = true;
        renderHome();
      });
  }

  // ---------- الصفحة الرئيسية ----------
  function renderHome() {
    currentView = 'home';
    session = null;
    app.innerHTML = '';
    app.appendChild(langBar());

    var header = el('div', 'site-header');
    header.appendChild(el('h1', null, t('title')));
    header.appendChild(el('p', 'sub', tf('greeting', { name: esc(user.name), n: allQuestions.length, u: QUIZ_UNITS.length }) + (syncFailed ? ' <span class="sync-warn">' + t('offline') + '</span>' : '')));
    var switchLink = el('button', 'switch-user', t('logout'));
    switchLink.addEventListener('click', logout);
    header.appendChild(switchLink);
    app.appendChild(header);

    var saved = validSavedSessions();
    if (saved.length) {
      var resumeCard = el('div', 'card resume-card-multi');
      resumeCard.appendChild(el('div', 'resume-title', tf('sessions', { n: saved.length })));
      saved.forEach(function (s) {
        var answeredCount = Object.keys(s.answers || {}).length;
        var row = el('div', 'resume-row');
        var rInfo = el('div', 'resume-info');
        rInfo.appendChild(el('div', 'resume-row-title', esc(sessionTitle(s.mode, s.title))));
        rInfo.appendChild(el('div', 'resume-meta', tf('sessionMeta', { a: answeredCount, t: s.ids.length, i: Math.min(s.i, s.ids.length - 1) + 1 })));
        row.appendChild(rInfo);
        var rActions = el('div', 'resume-actions');
        var resumeBtn = el('button', 'btn btn-primary btn-sm', t('resume'));
        resumeBtn.addEventListener('click', function () { resumeSession(s); });
        var dismissBtn = el('button', 'btn btn-soft btn-sm', '🗑');
        dismissBtn.title = t('deleteSession');
        dismissBtn.addEventListener('click', function () { removeSavedSession(s.sid); renderHome(); });
        rActions.appendChild(resumeBtn);
        rActions.appendChild(dismissBtn);
        row.appendChild(rActions);
        resumeCard.appendChild(row);
      });
      app.appendChild(resumeCard);
    }

    var optRow = el('div', 'options-row');
    var shuffleLbl = el('label');
    var shuffleCb = document.createElement('input');
    shuffleCb.type = 'checkbox';
    shuffleCb.checked = shufflePref;
    shuffleCb.addEventListener('change', function () { shufflePref = shuffleCb.checked; persist(); });
    shuffleLbl.appendChild(shuffleCb);
    shuffleLbl.appendChild(document.createTextNode(t('shuffleOpt')));
    optRow.appendChild(shuffleLbl);
    app.appendChild(optRow);

    var grid = el('div', 'mode-cards');

    var fullCard = el('div', 'card clickable mode-card');
    fullCard.appendChild(el('div', 'icon', '📝'));
    fullCard.appendChild(el('div', 'name', t('fullExam')));
    fullCard.appendChild(el('div', 'desc', t('fullExamDesc')));
    fullCard.appendChild(el('span', 'count', tf('qCount', { n: allQuestions.length })));
    fullCard.addEventListener('click', function () {
      startSession(allQuestions, 'all', t('fullExam'), shuffleCb.checked);
    });
    grid.appendChild(fullCard);

    var wrongList = Array.from(wrongPool).map(function (id) { return byId[id]; }).filter(Boolean);
    var wrongCard = el('div', 'card mode-card' + (wrongList.length ? ' clickable' : ' dim'));
    wrongCard.appendChild(el('div', 'icon', '🔁'));
    wrongCard.appendChild(el('div', 'name', t('wrongCard')));
    wrongCard.appendChild(el('div', 'desc', wrongList.length ? t('wrongDescHas') : t('wrongDescNone')));
    wrongCard.appendChild(el('span', 'count', tf('qCount', { n: wrongList.length })));
    if (wrongList.length) {
      wrongCard.addEventListener('click', function () {
        startSession(wrongList, 'wrong', t('wrongCard'), shuffleCb.checked);
      });
    }
    grid.appendChild(wrongCard);

    var flaggedList = Array.from(flags).map(function (id) { return byId[id]; }).filter(Boolean);
    var flagCard = el('div', 'card mode-card' + (flaggedList.length ? ' clickable' : ' dim'));
    flagCard.appendChild(el('div', 'icon', '🚩'));
    flagCard.appendChild(el('div', 'name', t('flagCard')));
    flagCard.appendChild(el('div', 'desc', flaggedList.length ? t('flagDescHas') : t('flagDescNone')));
    flagCard.appendChild(el('span', 'count', tf('qCount', { n: flaggedList.length })));
    if (flaggedList.length) {
      flagCard.addEventListener('click', function () {
        startSession(flaggedList, 'flagged', t('flagCard'), shuffleCb.checked);
      });
    }
    grid.appendChild(flagCard);

    var mixCard = el('div', 'card clickable mode-card');
    mixCard.appendChild(el('div', 'icon', '🎲'));
    mixCard.appendChild(el('div', 'name', t('quick')));
    mixCard.appendChild(el('div', 'desc', t('quickDesc')));
    mixCard.appendChild(el('span', 'count', tf('qCount', { n: 30 })));
    mixCard.addEventListener('click', function () {
      startSession(shuffle(allQuestions).slice(0, 30), 'quick', t('quick'), false);
    });
    grid.appendChild(mixCard);

    var vioModeCard = el('div', 'card clickable mode-card');
    vioModeCard.appendChild(el('div', 'icon', '⚠️'));
    vioModeCard.appendChild(el('div', 'name', t('vio')));
    vioModeCard.appendChild(el('div', 'desc', t('vioDesc')));
    vioModeCard.appendChild(el('span', 'count', tf('vioCount', { n: VIOLATIONS.length })));
    vioModeCard.addEventListener('click', renderViolations);
    grid.appendChild(vioModeCard);

    if (extraQuestions.length) {
      var extraCard = el('div', 'card clickable mode-card');
      extraCard.appendChild(el('div', 'icon', '🟡'));
      extraCard.appendChild(el('div', 'name', t('extra')));
      extraCard.appendChild(el('div', 'desc', t('extraDesc')));
      extraCard.appendChild(el('span', 'count', tf('qCount2', { n: extraQuestions.length })));
      extraCard.addEventListener('click', function () {
        startSession(extraQuestions, 'extra', t('extra'), shuffleCb.checked);
      });
      grid.appendChild(extraCard);
    }

    app.appendChild(grid);

    app.appendChild(el('div', 'section-label', t('byUnit')));
    if (LANG !== 'ar') app.appendChild(el('div', 'ar-note', t('arNote')));
    var list = el('div', 'unit-list');
    QUIZ_UNITS.forEach(function (u) {
      var card = el('div', 'card unit-card');

      var row = el('div', 'unit-row clickable-row');
      row.appendChild(el('div', 'unum', u.num));
      var info = el('div', 'uinfo');
      info.appendChild(el('div', 'uname', unitFull(u)));
      info.appendChild(el('div', 'umeta', tf('qCount2', { n: u.questions.length })));
      row.appendChild(info);
      var b = best['unit' + u.num];
      if (b) row.appendChild(el('div', 'ubest', tf('best', { s: b.score, t: b.total })));
      row.addEventListener('click', function () {
        startSession(u.questions, 'unit' + u.num, unitFull(u), shuffleCb.checked);
      });
      card.appendChild(row);

      var s = UNIT_SUMMARIES[u.num - 1];
      if (s) {
        var toggle = el('button', 'sum-toggle', t('sumShow'));
        var pointsWrap = el('ul', 'sum-points');
        pointsWrap.style.display = 'none';
        pointsWrap.dir = 'rtl';
        s.pts.forEach(function (p) { pointsWrap.appendChild(el('li', null, p)); });
        toggle.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var open = pointsWrap.style.display !== 'none';
          pointsWrap.style.display = open ? 'none' : '';
          toggle.innerHTML = open ? t('sumShow') : t('sumHide');
          toggle.classList.toggle('open', !open);
        });
        card.appendChild(toggle);
        card.appendChild(pointsWrap);
      }
      list.appendChild(card);
    });
    app.appendChild(list);

    var footer = el('footer', 'site-footer', t('footer'));
    app.appendChild(footer);
  }

  // ---------- صفحة جدول النقاط ----------
  function renderViolations() {
    currentView = 'vio';
    session = null;
    app.innerHTML = '';
    app.appendChild(langBar());

    var bar = el('div', 'topbar');
    var backBtn = el('button', 'btn btn-soft btn-sm', t('home'));
    backBtn.addEventListener('click', renderHome);
    bar.appendChild(backBtn);
    bar.appendChild(el('div', 'title', t('vioTitle')));
    app.appendChild(bar);

    var card = el('div', 'card vio-page-card');
    var tbl = el('table', 'vio-table');
    var th = t('vioTh');
    tbl.innerHTML = '<thead><tr><th>' + th[0] + '</th><th>' + th[1] + '</th><th>' + th[2] + '</th></tr></thead>';
    var tbody = document.createElement('tbody');
    VIOLATIONS.forEach(function (v, i) {
      var tr = document.createElement('tr');
      var sev = v[1] >= 24 ? '24' : v[1] >= 12 ? '12' : v[1] >= 8 ? '8' : v[1] >= 6 ? '6' : v[1] >= 4 ? '4' : '2';
      tr.className = 'row-' + sev;
      var name = esc(v[0]) + (v[2] ? ' <span class="vio-star">*</span>' : '');
      tr.innerHTML = '<td>' + (i + 1) + '</td><td dir="rtl">' + name + '</td><td><span class="vio-pts sev-' + sev + '">' + v[1] + '</span></td>';
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    card.appendChild(tbl);
    card.appendChild(el('div', 'vio-note', '<b class="vio-star">*</b> ' + t('vioStarNote')));
    card.appendChild(el('div', 'vio-note', t('vioSrc')));
    app.appendChild(card);
    window.scrollTo(0, 0);
  }

  // ---------- عرض السؤال ----------
  function renderQuestion() {
    currentView = 'quiz';
    var q = session.questions[session.i];
    var answered = session.answers.hasOwnProperty(q.id);
    persistSession();
    app.innerHTML = '';
    app.appendChild(langBar());

    var bar = el('div', 'topbar');
    var backBtn = el('button', 'btn btn-soft btn-sm', t('home'));
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
      progBlock.appendChild(progRow(tf('unitProg', { o: ORD(q.unit - 1) }), answeredIn(unitQs), unitQs.length));
      progBlock.appendChild(progRow(t('fullProg'), answeredIn(session.questions), session.questions.length));
    } else if (session.mode.indexOf('unit') === 0) {
      progBlock.appendChild(progRow(tf('unitProg', { o: ORD(q.unit - 1) }), answeredIn(session.questions), session.questions.length));
    } else {
      progBlock.appendChild(progRow(sessionTitle(session.mode, session.title), answeredIn(session.questions), session.questions.length));
    }
    bar.appendChild(progBlock);
    app.appendChild(bar);

    var showChips = session.mode === 'all' || session.mode.indexOf('unit') === 0;
    if (showChips) {
      var chips = el('div', 'unit-chips');
      QUIZ_UNITS.forEach(function (u) {
        var isCurrent = q.unit === u.num;
        var chipText = ORD(u.num - 1);
        var chipCls = 'unit-chip' + (isCurrent ? ' current' : '');
        if (session.mode === 'all') {
          var uqs = session.questions.filter(function (x) { return x.unit === u.num; });
          var uDone = uqs.every(function (x) { return session.answers.hasOwnProperty(x.id); });
          if (uDone) { chipText += ' ✓'; chipCls += ' done'; }
        }
        var chip = el('button', chipCls, chipText);
        chip.title = unitFull(u) + ' (' + u.questions.length + ')';
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
            startSession(u.questions, 'unit' + u.num, unitFull(u), session.shuffled);
          }
        });
        chips.appendChild(chip);
      });
      app.appendChild(chips);
    }

    var card = el('div', 'card q-card');
    var head = el('div', 'q-head');
    head.appendChild(el('div', 'q-num', session.i + 1));
    var qt = el('div', 'q-text');
    qt.innerHTML = esc(qText(q)) + '<span class="q-unit-tag">' + esc(tf('qTag', { u: unitTitleOf(q), n: q.n })) + '</span>';
    head.appendChild(qt);

    var flagBtn = el('button', 'flag-btn' + (flags.has(q.id) ? ' flagged' : ''), flags.has(q.id) ? '🚩' : '⚐');
    flagBtn.title = t('flagTip');
    flagBtn.addEventListener('click', function () {
      if (flags.has(q.id)) { flags.delete(q.id); flagBtn.classList.remove('flagged'); flagBtn.innerHTML = '⚐'; }
      else { flags.add(q.id); flagBtn.classList.add('flagged'); flagBtn.innerHTML = '🚩'; }
      persist();
    });
    head.appendChild(flagBtn);
    card.appendChild(head);

    if (q.figs && q.figs.length) {
      var figs = el('div', 'q-figs');
      q.figs.forEach(function (f) {
        var img = document.createElement('img');
        img.src = f;
        img.alt = t('figAlt');
        img.loading = 'lazy';
        figs.appendChild(img);
      });
      card.appendChild(figs);
    }

    var optsWrap = el('div', 'opts');
    q.opts.forEach(function (optText, idx) {
      var btn = el('button', 'opt');
      btn.type = 'button';
      var letter = el('span', 'letter', LETTERS()[idx]);
      btn.appendChild(letter);
      var body = el('div', 'opt-body');
      var text = qOpt(q, idx);
      if (q.optImgs && q.optImgs[idx]) {
        var oi = document.createElement('img');
        oi.src = q.optImgs[idx];
        oi.alt = tf('optAlt', { L: LETTERS()[idx] });
        body.appendChild(oi);
        if (text) body.appendChild(el('div', null, esc(text)));
      } else {
        body.innerHTML = esc(text);
      }
      btn.appendChild(body);
      btn.addEventListener('click', function () { answer(q, idx); });
      optsWrap.appendChild(btn);
    });
    card.appendChild(optsWrap);
    app.appendChild(card);

    var nav = el('div', 'quiz-nav');
    var prevBtn = el('button', 'btn btn-soft nav-prev', t('prev'));
    prevBtn.disabled = session.i === 0;
    prevBtn.addEventListener('click', function () {
      if (session.i > 0) { session.i--; renderQuestion(); window.scrollTo(0, 0); }
    });
    var nextLabel;
    if (session.i + 1 < session.questions.length) {
      nextLabel = t('skip');
    } else {
      var rem0 = remainingCount();
      nextLabel = rem0 > 0 ? tf('remaining', { n: rem0 }) : t('showResult');
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
    fb.appendChild(el('div', 'verdict', ok ? t('correct') : t('wrong')));
    var whyHtml = '';
    if (!ok) whyHtml += '<b>' + tf('correctIs', { L: LETTERS()[q.correct] }) + '</b> ' + esc(stripImgOptText(q, q.correct)) + '<br>';
    whyHtml += '<b>' + t('why') + '</b> ' + esc(qWhy(q));
    fb.appendChild(el('div', 'why', whyHtml));
    var qCard = app.querySelector('.q-card');
    qCard.appendChild(fb);

    var nav = app.querySelector('.quiz-nav');
    var nextBtn = nav.querySelector('.nav-next');
    nextBtn.className = 'btn btn-primary nav-next';
    if (session.i + 1 < session.questions.length) {
      nextBtn.innerHTML = t('next');
    } else {
      var rem = remainingCount();
      nextBtn.innerHTML = rem > 0 ? tf('remaining', { n: rem }) : t('showResult');
    }
    if (!ok && !nav.querySelector('.wrong-note')) {
      nav.appendChild(el('span', 'progress-text wrong-note', t('addedWrong')));
    }
    nextBtn.focus();
  }

  function stripImgOptText(q, idx) {
    var text = qOpt(q, idx);
    if (text) return text;
    if (q.optImgs && q.optImgs[idx]) return tf('imgOpt', { L: LETTERS()[idx] });
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
    currentView = 'summary';
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
    savedSessions = savedSessions.filter(function (s) { return s.sid !== session.sid; });
    persist();

    app.innerHTML = '';
    app.appendChild(langBar());
    var bar = el('div', 'topbar');
    bar.appendChild(el('div', 'title', tf('resultTitle', { t: sessionTitle(session.mode, session.title) })));
    app.appendChild(bar);

    var card = el('div', 'card summary');
    var cls = pct >= 85 ? 'good' : pct >= 60 ? 'mid' : 'bad';
    card.appendChild(el('div', 'score-ring ' + cls, pct + '٪'));
    card.appendChild(el('div', 'verdict-line',
      pct >= 85 ? t('vGreat') : pct >= 60 ? t('vGood') : t('vWeak')));
    card.appendChild(el('div', 'detail',
      tf('scoreLine', { s: score, t: total }) +
      (skipped ? tf('skippedNote', { n: skipped }) : '')));

    var actions = el('div', 'summary-actions');
    if (wrongQs.length) {
      var retryWrong = el('button', 'btn btn-red', tf('retryWrong', { n: wrongQs.length }));
      retryWrong.addEventListener('click', function () {
        startSession(wrongQs, session.mode, sessionTitle(session.mode, session.title) + t('retryTag'), false);
      });
      actions.appendChild(retryWrong);
    }
    var retryAll = el('button', 'btn btn-primary', t('retryAll'));
    var mode = session.mode, allQs = qs, wasShuffled = session.shuffled;
    retryAll.addEventListener('click', function () {
      var base = mode === 'all' ? allQuestions :
                 mode === 'extra' ? extraQuestions :
                 mode.indexOf('unit') === 0 ? QUIZ_UNITS[parseInt(mode.slice(4), 10) - 1].questions :
                 allQs;
      startSession(base, mode, sessionTitle(mode, session.title), wasShuffled);
    });
    actions.appendChild(retryAll);
    var homeBtn = el('button', 'btn btn-soft', t('backHome'));
    homeBtn.addEventListener('click', renderHome);
    actions.appendChild(homeBtn);
    card.appendChild(actions);

    var list = el('div', 'review-list');
    list.appendChild(el('div', 'section-label', t('details')));
    qs.forEach(function (q, i) {
      var wasAnswered = session.answers.hasOwnProperty(q.id);
      var ok = wasAnswered && isCorrectChoice(q, session.answers[q.id]);
      var item = el('div', 'review-item');
      item.appendChild(el('span', 'mark ' + (ok ? 'ok' : 'bad'), ok ? '✔' : (wasAnswered ? '✘' : '—')));
      var label = (i + 1) + '. ' + qText(q);
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
    renderAuth();
  }
})();
