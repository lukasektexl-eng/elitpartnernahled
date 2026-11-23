/* Elit Partner – ukázkový návrh. Nic se neodesílá, nic se neukládá. */
(function () {
  "use strict";

  var TZ = "Europe/Prague";
  var OPEN_MIN = 8 * 60, CLOSE_MIN = 17 * 60;   // Po–Pá 8:00–17:00
  var SLOT_STEP = 30, MAX_DAYS = 75;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- čas v Praze ---------- */
  function pragueNow() {
    var parts = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var d = new Date(+parts.year, +parts.month - 1, +parts.day);
    return { date: d, minutes: +parts.hour * 60 + +parts.minute };
  }

  /* ---------- české státní svátky ---------- */
  function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31),
      da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, da);
  }
  var holidayCache = {};
  function isHoliday(d) {
    var y = d.getFullYear();
    if (!holidayCache[y]) {
      var set = {};
      ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"]
        .forEach(function (md) { set[md] = 1; });
      var es = easterSunday(y);
      var fri = new Date(y, es.getMonth(), es.getDate() - 2);
      var mon = new Date(y, es.getMonth(), es.getDate() + 1);
      set[md(fri)] = 1; set[md(mon)] = 1;
      holidayCache[y] = set;
    }
    return !!holidayCache[y][md(d)];
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function md(d) { return pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function sameDay(a, b) { return a && b && a.getTime() === b.getTime(); }
  function isWorkday(d) { var w = d.getDay(); return w !== 0 && w !== 6 && !isHoliday(d); }
  function hm(min) { return Math.floor(min / 60) + ":" + pad(min % 60); }

  var DAYS = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
  var DAYS_SHORT = ["ne", "po", "út", "st", "čt", "pá", "so"];
  var MONTHS_GEN = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
  var MONTHS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
  function longDate(d) { return DAYS[d.getDay()] + " " + d.getDate() + ". " + MONTHS_GEN[d.getMonth()]; }
  function shortDate(d) { return DAYS_SHORT[d.getDay()] + " " + d.getDate() + ". " + (d.getMonth() + 1) + "."; }

  /* ---------- stav otevřeno / zavřeno + časová osa ---------- */
  (function hours() {
    var now = pragueNow(), d = now.date, m = now.minutes, dow = d.getDay();
    var row = document.querySelector('.hours__table tr[data-dow="' + dow + '"]');
    if (row) row.classList.add("is-today");

    var short, long, open = false;
    if (isHoliday(d)) {
      short = "· dnes je státní svátek";
      long = "Dnes je státní svátek.";
    } else if (dow === 0 || dow === 6) {
      short = "· dnes zavřeno";
      long = "Dnes zavřeno. Otevíráme v pondělí v 8:00.";
    } else if (m < OPEN_MIN) {
      short = "· dnes od 8:00";
      long = "Zatím zavřeno, dnes otevíráme v 8:00.";
    } else if (m < CLOSE_MIN) {
      open = true;
      short = "· teď otevřeno";
      long = "Teď otevřeno, dnes do 17:00.";
    } else {
      short = "· dnes už zavřeno";
      long = dow === 5 ? "Dnes už zavřeno. Otevíráme v pondělí v 8:00." : "Dnes už zavřeno. Zítra otevíráme v 8:00.";
    }
    document.querySelectorAll("[data-status]").forEach(function (el) {
      el.textContent = " " + short;
      el.classList.toggle("is-closed", !open);
      el.hidden = false;
    });
    document.querySelectorAll("[data-status-long]").forEach(function (el) {
      el.textContent = long;
      el.classList.add(open ? "is-open" : "is-closed");
    });
    var marker = document.getElementById("now-marker");
    if (marker && m >= 6 * 60 && m <= 20 * 60) {
      marker.style.left = ((m - 6 * 60) / (14 * 60) * 100) + "%";
      marker.hidden = false;
    }
  })();

  /* ---------- animace při scrollu ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); rio.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    reveals.forEach(function (el) {
      var i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(i, 4) * 70 + "ms";
      rio.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- výkres: rozložení kola + propojení se službami ---------- */
  var wheel = document.querySelector(".wheel");
  if (wheel) {
    // dva snímky, aby prohlížeč nejdřív vykreslil poskládané kolo
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { wheel.classList.add("is-built"); });
    });
    setTimeout(function () { wheel.classList.add("is-settled"); }, reduce ? 0 : 2400);

    var linked = document.querySelectorAll("[data-part]");
    function hot(num) {
      wheel.classList.toggle("has-hot", !!num);
      linked.forEach(function (el) {
        el.classList.toggle("is-hot", !!num && el.getAttribute("data-part") === num);
      });
    }
    linked.forEach(function (el) {
      var num = el.getAttribute("data-part");
      el.addEventListener("mouseenter", function () { hot(num); });
      el.addEventListener("mouseleave", function () { hot(null); });
      if (el.tagName === "A") {
        el.addEventListener("focus", function () { hot(num); });
        el.addEventListener("blur", function () { hot(null); });
      }
    });
    // díl ve výkresu je klikací: posune na službu v kusovníku
    wheel.querySelectorAll(".part, .callout").forEach(function (g) {
      g.style.cursor = "pointer";
      g.addEventListener("click", function () {
        var row = document.getElementById("s-" + g.getAttribute("data-part"));
        if (row) row.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      });
    });
  }

  /* ---------- objednání (demo) ---------- */
  var form = document.getElementById("booking-form");
  if (!form) return;

  var widget = document.getElementById("widget");
  var booking = document.querySelector(".booking");
  var steps = form.querySelectorAll(".step");
  var inds = document.querySelectorAll("[data-step-ind]");
  var backBtn = document.getElementById("back-btn");
  var nextBtn = document.getElementById("next-btn");
  var foot = document.getElementById("widget-foot");
  var summaryEl = document.getElementById("summary");
  var calGrid = document.getElementById("cal-grid");
  var calMonth = document.getElementById("cal-month");
  var prevM = form.querySelector('[data-cal="prev"]');
  var nextM = form.querySelector('[data-cal="next"]');
  var slotsBox = document.getElementById("slots");
  var slotsDay = document.getElementById("slots-day");
  var nameIn = document.getElementById("f-name");
  var phoneIn = document.getElementById("f-phone");
  var spzIn = document.getElementById("f-spz");

  var state = { step: 1, service: "", day: null, time: "", view: null };

  function bounds() {
    var now = pragueNow();
    return { today: now.date, nowMin: now.minutes, last: addDays(now.date, MAX_DAYS) };
  }

  function busy(day, min) {
    // FNV-1a: stabilní „náhodná“ obsazenost ~1/3 slotů (jen pro ukázku)
    var s = iso(day) + "T" + min, h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
    return h % 3 === 0;
  }

  function slotsFor(day) {
    var b = bounds(), out = [];
    for (var m = OPEN_MIN; m < CLOSE_MIN; m += SLOT_STEP) {
      if (sameDay(day, b.today) && m < b.nowMin + 60) continue;
      out.push({ min: m, busy: busy(day, m) });
    }
    return out;
  }

  function dayAvailable(d) {
    var b = bounds();
    if (d < b.today || d > b.last || !isWorkday(d)) return false;
    return slotsFor(d).some(function (s) { return !s.busy; });
  }

  /* kalendář */
  function renderCal() {
    var b = bounds();
    if (!state.view) {
      state.view = new Date(b.today.getFullYear(), b.today.getMonth(), 1);
      var anyFree = false;
      for (var t = new Date(b.today); t.getMonth() === state.view.getMonth(); t = addDays(t, 1)) {
        if (dayAvailable(t)) { anyFree = true; break; }
      }
      if (!anyFree) state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1);
    }
    var v = state.view, y = v.getFullYear(), mo = v.getMonth();
    calMonth.textContent = MONTHS[mo] + " " + y;
    prevM.disabled = y === b.today.getFullYear() && mo === b.today.getMonth();
    nextM.disabled = y === b.last.getFullYear() && mo === b.last.getMonth();

    calGrid.innerHTML = "";
    var lead = (v.getDay() + 6) % 7;
    for (var i = 0; i < lead; i++) {
      var p = document.createElement("span"); p.className = "cal__pad"; calGrid.appendChild(p);
    }
    var days = new Date(y, mo + 1, 0).getDate(), focusable = null;
    for (var dnum = 1; dnum <= days; dnum++) {
      var d = new Date(y, mo, dnum);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal__day";
      btn.textContent = dnum;
      btn.dataset.date = iso(d);
      var ok = dayAvailable(d);
      var label = longDate(d);
      if (!ok) {
        btn.disabled = true;
        if (isHoliday(d)) label += ", státní svátek";
        else if (d.getDay() === 0 || d.getDay() === 6) label += ", zavřeno";
        else label += ", nelze vybrat";
      }
      if (sameDay(d, b.today)) { btn.classList.add("is-today"); label += ", dnes"; }
      btn.setAttribute("aria-label", label);
      var sel = sameDay(d, state.day);
      btn.setAttribute("aria-pressed", sel ? "true" : "false");
      btn.tabIndex = -1;
      if (ok && (sel || !focusable)) focusable = btn;
      if (sel) focusable = btn;
      calGrid.appendChild(btn);
    }
    if (focusable) focusable.tabIndex = 0;
  }

  prevM.addEventListener("click", function () { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCal(); });
  nextM.addEventListener("click", function () { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCal(); });

  calGrid.addEventListener("click", function (e) {
    var btn = e.target.closest(".cal__day");
    if (!btn || btn.disabled) return;
    var p = btn.dataset.date.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (!sameDay(d, state.day)) state.time = "";
    state.day = d;
    renderCal();
    var again = calGrid.querySelector('[data-date="' + iso(d) + '"]');
    if (again) again.focus();
    update();
  });

  calGrid.addEventListener("keydown", function (e) {
    var moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in moves)) return;
    var all = Array.prototype.slice.call(calGrid.querySelectorAll(".cal__day"));
    var i = all.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    var step = moves[e.key], j = i + step;
    while (j >= 0 && j < all.length && all[j].disabled) j += step > 0 ? 1 : -1;
    if (j >= 0 && j < all.length) {
      all.forEach(function (b) { b.tabIndex = -1; });
      all[j].tabIndex = 0;
      all[j].focus();
    }
  });

  /* časy */
  function renderSlots() {
    slotsBox.querySelectorAll(".slot").forEach(function (n) { n.remove(); });
    if (!state.day) return;
    slotsDay.textContent = "Vybraný den: " + longDate(state.day);
    slotsFor(state.day).forEach(function (s) {
      var lab = document.createElement("label");
      lab.className = "slot";
      var inp = document.createElement("input");
      inp.type = "radio"; inp.name = "time"; inp.value = hm(s.min);
      if (s.busy) { inp.disabled = true; inp.setAttribute("aria-label", hm(s.min) + ", obsazeno"); }
      if (inp.value === state.time) inp.checked = true;
      var sp = document.createElement("span");
      sp.textContent = hm(s.min);
      lab.appendChild(inp); lab.appendChild(sp);
      slotsBox.appendChild(lab);
    });
  }
  slotsBox.addEventListener("change", function (e) {
    if (e.target.name === "time") { state.time = e.target.value; update(); }
  });

  form.addEventListener("change", function (e) {
    if (e.target.name === "service") { state.service = e.target.value; update(); }
  });

  /* validace údajů */
  function errFor(input) {
    var v = input.value.trim();
    if (input === nameIn) return v.length >= 2 ? "" : "Vyplňte prosím jméno.";
    if (input === phoneIn) {
      var digits = v.replace(/\D/g, "");
      if (!v) return "Vyplňte prosím telefon.";
      return digits.length >= 9 && digits.length <= 12 ? "" : "Zadejte telefon ve tvaru např. 777 123 456.";
    }
    return "";
  }
  function showErr(input, msg) {
    var el = document.getElementById(input.id + "-err");
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    if (el) el.textContent = msg;
  }
  [nameIn, phoneIn].forEach(function (inp) {
    inp.addEventListener("blur", function () { if (inp.value) showErr(inp, errFor(inp)); });
    inp.addEventListener("input", function () {
      if (inp.getAttribute("aria-invalid")) showErr(inp, errFor(inp));
      update();
    });
  });
  spzIn.addEventListener("input", function () {
    var pos = spzIn.selectionStart;
    spzIn.value = spzIn.value.toUpperCase();
    try { spzIn.setSelectionRange(pos, pos); } catch (err) { /* nic */ }
    update();
  });

  /* zakázkový list */
  var last = {};
  function setTicket(key, val) {
    var dd = document.querySelector('[data-t="' + key + '"]');
    if (!dd || last[key] === val) return;
    last[key] = val;
    dd.textContent = val;
    if (val && !reduce) {
      dd.classList.add("is-new");
      setTimeout(function () { dd.classList.remove("is-new"); }, 700);
    }
  }

  function complete(step) {
    if (step === 1) return !!state.service;
    if (step === 2) return !!state.day;
    if (step === 3) return !!state.time;
    if (step === 4) return !!nameIn.value.trim() && !!phoneIn.value.trim();
    return true;
  }

  function summaryText() {
    var parts = [];
    if (state.service) parts.push(state.service);
    if (state.day) parts.push(shortDate(state.day));
    if (state.time) parts.push(state.time);
    return parts.join(" · ");
  }

  function update() {
    summaryEl.textContent = summaryText();
    nextBtn.disabled = !complete(state.step);
    nextBtn.textContent = state.step === 4 ? "Potvrdit" : "Pokračovat";
    backBtn.hidden = state.step === 1;
    foot.hidden = state.step === 5;
    setTicket("service", state.service);
    setTicket("day", state.day ? longDate(state.day) : "");
    setTicket("time", state.time);
    setTicket("name", nameIn.value.trim());
    setTicket("phone", phoneIn.value.trim());
    setTicket("spz", spzIn.value.trim());
  }

  function go(n, opts) {
    state.step = n;
    steps.forEach(function (s) { s.hidden = +s.dataset.step !== n; });
    inds.forEach(function (li) {
      var k = +li.dataset.stepInd;
      if (k === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      li.classList.toggle("is-done", k < n);
    });
    if (n === 2) renderCal();
    if (n === 3) renderSlots();
    booking.classList.toggle("is-done", n === 5);
    update();

    if (opts && opts.noFocus) return;
    var title = form.querySelector('.step[data-step="' + n + '"] .step__title');
    var r = widget.getBoundingClientRect();
    if (r.top < 60 || r.top > window.innerHeight * 0.6) {
      widget.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
    if (title) title.focus({ preventScroll: true });
  }

  nextBtn.addEventListener("click", function () {
    if (state.step === 4) {
      var bad = null;
      [nameIn, phoneIn].forEach(function (inp) {
        var m = errFor(inp); showErr(inp, m); if (m && !bad) bad = inp;
      });
      if (bad) { bad.focus(); return; }
      document.getElementById("done-summary").textContent =
        state.service + ", " + longDate(state.day) + " v " + state.time + ".";
      go(5);
      return;
    }
    if (complete(state.step)) go(state.step + 1);
  });
  backBtn.addEventListener("click", function () { if (state.step > 1) go(state.step - 1); });

  form.addEventListener("submit", function (e) { e.preventDefault(); if (!nextBtn.disabled) nextBtn.click(); });
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "radio") { e.preventDefault(); if (!nextBtn.disabled) nextBtn.click(); }
  });

  document.getElementById("restart-btn").addEventListener("click", function () {
    form.reset();
    state = { step: 1, service: "", day: null, time: "", view: null };
    [nameIn, phoneIn].forEach(function (i) { showErr(i, ""); });
    go(1);
  });

  /* „Objednat“ u služeb */
  document.querySelectorAll("[data-preselect]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var val = a.getAttribute("data-preselect");
      var radio = form.querySelector('input[name="service"][value="' + val + '"]');
      if (radio) radio.checked = true;
      state.service = val;
      go(2, { noFocus: true });
      widget.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      var t = form.querySelector('.step[data-step="2"] .step__title');
      if (t) t.focus({ preventScroll: true });
    });
  });

  /* .ics – vytvoří se v prohlížeči */
  document.getElementById("ics-btn").addEventListener("click", function () {
    var p = state.time.split(":"), d = state.day;
    var start = "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(+p[0]) + pad(+p[1]) + "00";
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ukazkovy navrh//Elit Partner//CS", "CALSCALE:GREGORIAN",
      "BEGIN:VTIMEZONE", "TZID:Europe/Prague",
      "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
      "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
      "END:VTIMEZONE",
      "BEGIN:VEVENT",
      "UID:" + start + "-" + Math.random().toString(36).slice(2) + "@ukazka.elitpartner",
      "DTSTAMP:" + stamp,
      "DTSTART;TZID=Europe/Prague:" + start,
      "DURATION:PT30M",
      "SUMMARY:" + esc("Autoservis Elit Partner – " + state.service + " (UKÁZKA, nepotvrzeno)"),
      "LOCATION:" + esc("Rooseveltova 364/17, 251 01 Říčany"),
      "DESCRIPTION:" + esc("Ukázkový návrh webu – termín nebyl odeslán ani potvrzen. Telefon servisu: 603 282 222."),
      "END:VEVENT", "END:VCALENDAR"
    ];
    var blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "elit-partner-termin-ukazka.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  function esc(s) { return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,"); }

  /* mobil: schovat pevné „Zavolat“, když je vidět objednávka */
  var fab = document.querySelector(".call-fab-wrap");
  if (fab && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      fab.classList.toggle("is-away", vis);
      document.body.classList.toggle("fab-away", vis);
    }, { threshold: 0.15 }).observe(widget);
  }

  go(1, { noFocus: true });
})();
