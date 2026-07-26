/* اختبار القيادة النظري — تطبيق تفاعلي على أسئلة النزاوي لتعليم القيادة */
(function () {
  'use strict';

  var LETTERS = ['أ', 'ب', 'ج', 'د'];
  var app = document.getElementById('app');

  // ---------- التخزين المحلي ----------
  var store = {
    read: function (key, fallback) {
      try {
        var v = localStorage.getItem('nizawi_' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    write: function (key, val) {
      try { localStorage.setItem('nizawi_' + key, JSON.stringify(val)); } catch (e) {}
    }
  };

  var flags = new Set(store.read('flags', []));          // أسئلة معلّمة للمراجعة
  var wrongPool = new Set(store.read('wrong', []));      // أسئلة أُجيبت خطأ ولم تُصحح بعد
  var best = store.read('best', {});                     // أفضل نتيجة لكل وضع

  function saveFlags() { store.write('flags', Array.from(flags)); }
  function saveWrong() { store.write('wrong', Array.from(wrongPool)); }
  function saveBest() { store.write('best', best); }

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

  function isCorrectChoice(q, idx) {
    if (idx === q.correct) return true;
    return Array.isArray(q.alsoCorrect) && q.alsoCorrect.indexOf(idx) !== -1;
  }

  // ---------- حالة الجلسة ----------
  var session = null; // {questions, i, answers:{}, mode, title, shuffled}

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startSession(questions, mode, title, doShuffle) {
    if (!questions.length) return;
    session = {
      questions: doShuffle ? shuffle(questions) : questions.slice(),
      i: 0,
      answers: {},
      mode: mode,
      title: title,
      shuffled: !!doShuffle
    };
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

  // ---------- الصفحة الرئيسية ----------
  function renderHome() {
    session = null;
    app.innerHTML = '';

    var header = el('div', 'site-header');
    header.appendChild(el('h1', null, '🚗 اختبار القيادة النظري'));
    header.appendChild(el('p', 'sub', 'تدرّبي على عينة أسئلة اختبار القيادة من كتاب النزاوي لتعليم القيادة — ' + allQuestions.length + ' سؤالًا في ' + QUIZ_UNITS.length + ' وحدات'));
    app.appendChild(header);

    // خيار الخلط
    var optRow = el('div', 'options-row');
    var shuffleLbl = el('label');
    var shuffleCb = document.createElement('input');
    shuffleCb.type = 'checkbox';
    shuffleCb.checked = !!store.read('shuffle', false);
    shuffleCb.addEventListener('change', function () { store.write('shuffle', shuffleCb.checked); });
    shuffleLbl.appendChild(shuffleCb);
    shuffleLbl.appendChild(document.createTextNode('خلط ترتيب الأسئلة'));
    optRow.appendChild(shuffleLbl);
    app.appendChild(optRow);

    function wantShuffle() { return shuffleCb.checked; }

    // بطاقات الأوضاع
    var grid = el('div', 'mode-cards');

    var fullCard = el('div', 'card clickable mode-card');
    fullCard.appendChild(el('div', 'icon', '📝'));
    fullCard.appendChild(el('div', 'name', 'الاختبار الشامل'));
    fullCard.appendChild(el('div', 'desc', 'جميع أسئلة الوحدات الثماني في اختبار واحد'));
    fullCard.appendChild(el('span', 'count', allQuestions.length + ' سؤال'));
    fullCard.addEventListener('click', function () {
      startSession(allQuestions, 'all', 'الاختبار الشامل', wantShuffle());
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
        startSession(wrongList, 'wrong', 'إعادة الأخطاء', wantShuffle());
      });
    }
    grid.appendChild(wrongCard);

    var flaggedList = Array.from(flags).map(function (id) { return byId[id]; }).filter(Boolean);
    var flagCard = el('div', 'card mode-card' + (flaggedList.length ? ' clickable' : ' dim'));
    flagCard.appendChild(el('div', 'icon', '⭐'));
    flagCard.appendChild(el('div', 'name', 'أسئلة المراجعة'));
    flagCard.appendChild(el('div', 'desc', flaggedList.length ? 'الأسئلة التي وضعتِ عليها علامة مراجعة' : 'لم تضعي علامة مراجعة على أي سؤال بعد'));
    flagCard.appendChild(el('span', 'count', flaggedList.length + ' سؤال'));
    if (flaggedList.length) {
      flagCard.addEventListener('click', function () {
        startSession(flaggedList, 'flagged', 'أسئلة المراجعة', wantShuffle());
      });
    }
    grid.appendChild(flagCard);

    var mixCard = el('div', 'card clickable mode-card');
    mixCard.appendChild(el('div', 'icon', '🎲'));
    mixCard.appendChild(el('div', 'name', 'اختبار سريع'));
    mixCard.appendChild(el('div', 'desc', '20 سؤالًا عشوائيًا من كل الوحدات — محاكاة سريعة للاختبار'));
    mixCard.appendChild(el('span', 'count', '20 سؤال'));
    mixCard.addEventListener('click', function () {
      startSession(shuffle(allQuestions).slice(0, 20), 'quick', 'اختبار سريع', false);
    });
    grid.appendChild(mixCard);

    app.appendChild(grid);

    // الوحدات
    app.appendChild(el('div', 'section-label', 'التدرب حسب الوحدة'));
    var list = el('div', 'unit-list');
    QUIZ_UNITS.forEach(function (u) {
      var row = el('div', 'card clickable unit-row');
      row.appendChild(el('div', 'unum', u.num));
      var info = el('div', 'uinfo');
      info.appendChild(el('div', 'uname', u.full));
      var meta = el('div', 'umeta', u.questions.length + ' سؤالًا');
      info.appendChild(meta);
      row.appendChild(info);
      var b = best['unit' + u.num];
      if (b) row.appendChild(el('div', 'ubest', 'أفضل نتيجة: ' + b.score + '/' + b.total));
      row.addEventListener('click', function () {
        startSession(u.questions, 'unit' + u.num, u.full, shuffleCb.checked);
      });
      list.appendChild(row);
    });
    app.appendChild(list);

    app.appendChild(el('div', 'notice',
      '📖 المصدر: عينة أسئلة اختبار القيادة من كتاب «النزاوي لتعليم القيادة»، والإجابات الصحيحة منقولة من تظليل الكتاب ومفتاح إجاباته. ' +
      'شرح الإجابات مُعدّ للمساعدة على الفهم وليس نصًا من الكتاب. تقدمك (العلامات والأخطاء) يُحفظ على جهازك.'));

    var footer = el('footer', 'site-footer', 'جميع الأسئلة منقولة من كتاب النزاوي لتعليم القيادة لأغراض التدريب الشخصي');
    app.appendChild(footer);
  }

  // ---------- عرض السؤال ----------
  function renderQuestion() {
    var q = session.questions[session.i];
    var answered = session.answers.hasOwnProperty(q.id);
    app.innerHTML = '';

    // الشريط العلوي
    var bar = el('div', 'topbar');
    var backBtn = el('button', 'btn btn-soft btn-sm', 'الرئيسية ⌂');
    backBtn.addEventListener('click', function () {
      if (Object.keys(session.answers).length === 0) { renderHome(); return; }
      if (backBtn.dataset.arm) { renderHome(); return; }
      backBtn.dataset.arm = '1';
      backBtn.innerHTML = 'تأكيد الخروج؟';
      backBtn.classList.add('btn-red');
      setTimeout(function () {
        if (!backBtn.isConnected) return;
        delete backBtn.dataset.arm;
        backBtn.innerHTML = 'الرئيسية ⌂';
        backBtn.classList.remove('btn-red');
      }, 2500);
    });
    bar.appendChild(backBtn);
    var pw = el('div', 'progress-wrap');
    var pb = el('div', 'progress-bar');
    pb.style.width = Math.round((session.i / session.questions.length) * 100) + '%';
    pw.appendChild(pb);
    bar.appendChild(pw);
    bar.appendChild(el('span', 'progress-text', (session.i + 1) + ' / ' + session.questions.length));
    app.appendChild(bar);

    // شريط التنقل بين الوحدات (في الاختبار الشامل: قفز داخل الجلسة، وفي وضع الوحدة: تبديل الوحدة)
    var showChips = session.mode === 'all' || session.mode.indexOf('unit') === 0;
    if (showChips) {
      var chips = el('div', 'unit-chips');
      chips.appendChild(el('span', 'chips-label', 'الوحدات:'));
      QUIZ_UNITS.forEach(function (u) {
        var isCurrent = q.unit === u.num;
        var chip = el('button', 'unit-chip' + (isCurrent ? ' current' : ''), u.num);
        chip.title = u.full + ' (' + u.questions.length + ' سؤالًا)';
        chip.addEventListener('click', function () {
          if (session.mode === 'all') {
            // القفز إلى أول سؤال من هذه الوحدة داخل الجلسة (يعمل مع الترتيب الأصلي والمخلوط)
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

    var flagBtn = el('button', 'flag-btn' + (flags.has(q.id) ? ' flagged' : ''), flags.has(q.id) ? '⭐' : '☆');
    flagBtn.title = 'علامة مراجعة — يبقى السؤال في قائمة المراجعة لإعادة التدرب عليه';
    flagBtn.addEventListener('click', function () {
      if (flags.has(q.id)) { flags.delete(q.id); flagBtn.classList.remove('flagged'); flagBtn.innerHTML = '☆'; }
      else { flags.add(q.id); flagBtn.classList.add('flagged'); flagBtn.innerHTML = '⭐'; }
      saveFlags();
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
    var nextBtn = el('button', 'btn btn-ghost nav-next', session.i + 1 < session.questions.length ? 'تخطي السؤال ←' : 'إنهاء الاختبار 🏁');
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
      if (wrongPool.has(q.id)) { wrongPool.delete(q.id); saveWrong(); }
    } else {
      if (!wrongPool.has(q.id)) { wrongPool.add(q.id); saveWrong(); }
    }
    showFeedback(q, idx);
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

    // تحويل زر التخطي إلى زر التالي الأساسي مع إبقاء زر السابق
    var nav = app.querySelector('.quiz-nav');
    var nextBtn = nav.querySelector('.nav-next');
    nextBtn.className = 'btn btn-primary nav-next';
    nextBtn.innerHTML = session.i + 1 < session.questions.length ? 'السؤال التالي ←' : 'عرض النتيجة 🏁';
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

  function next() {
    if (session.i + 1 < session.questions.length) {
      session.i++;
      renderQuestion();
      window.scrollTo(0, 0);
    } else {
      renderSummary();
      window.scrollTo(0, 0);
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

    // حفظ أفضل نتيجة
    var prev = best[session.mode];
    if (!prev || score / total > prev.score / prev.total) {
      best[session.mode] = { score: score, total: total };
      saveBest();
    }

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
      // نعيد نفس مجموعة الأسئلة (بترتيبها الأصلي إن لم يكن خلط)
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

    // تفاصيل الأسئلة
    var list = el('div', 'review-list');
    list.appendChild(el('div', 'section-label', 'تفاصيل الجلسة'));
    qs.forEach(function (q, i) {
      var wasAnswered = session.answers.hasOwnProperty(q.id);
      var ok = wasAnswered && isCorrectChoice(q, session.answers[q.id]);
      var item = el('div', 'review-item');
      item.appendChild(el('span', 'mark ' + (ok ? 'ok' : 'bad'), ok ? '✔' : (wasAnswered ? '✘' : '—')));
      var label = (i + 1) + '. ' + q.q;
      if (flags.has(q.id)) label = '⭐ ' + label;
      item.appendChild(el('span', null, esc(label)));
      list.appendChild(item);
    });
    card.appendChild(list);
    app.appendChild(card);
  }

  // ---------- البداية ----------
  renderHome();
})();
