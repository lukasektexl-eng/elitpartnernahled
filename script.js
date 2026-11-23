(function () {
  "use strict";

  /* ---------- Animace při scrollu ---------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) {
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(siblings, 4) * 80 + "ms";
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Demo formulář ---------- */
  var form = document.getElementById("booking-form");
  if (!form) return;

  var dateInput = document.getElementById("f-date");
  var done = document.getElementById("booking-done");
  var summary = document.getElementById("booking-summary");

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function toISO(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  function isWeekend(d) { var w = d.getDay(); return w === 0 || w === 6; }

  // nejbližší pracovní den od zítřka
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var first = new Date(today); first.setDate(first.getDate() + 1);
  while (isWeekend(first)) first.setDate(first.getDate() + 1);
  var last = new Date(today); last.setDate(last.getDate() + 90);
  dateInput.min = toISO(first);
  dateInput.max = toISO(last);

  var dayNames = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];

  function setError(input, msg) {
    var err = document.getElementById(input.id + "-err");
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      if (err) err.textContent = msg;
    } else {
      input.removeAttribute("aria-invalid");
      if (err) err.textContent = "";
    }
  }

  function validateField(input) {
    var v = (input.value || "").trim();
    switch (input.id) {
      case "f-service":
        return v ? "" : "Vyberte prosím službu.";
      case "f-time":
        return v ? "" : "Vyberte prosím čas (8:00–16:00).";
      case "f-name":
        return v.length >= 2 ? "" : "Vyplňte prosím jméno.";
      case "f-phone":
        var digits = v.replace(/[^\d]/g, "");
        if (!v) return "Vyplňte prosím telefon.";
        return digits.length >= 9 && digits.length <= 12 ? "" : "Zadejte telefon ve tvaru např. 777 123 456.";
      case "f-date":
        if (!v) return "Vyberte prosím den.";
        var d = parseISO(v);
        if (!d) return "Zadejte platné datum.";
        if (isWeekend(d)) return "O víkendu je zavřeno. Vyberte prosím den Po–Pá.";
        if (d < first) return "Vyberte prosím den od " + first.toLocaleDateString("cs-CZ") + ".";
        if (d > last) return "Vyberte prosím den v nejbližších 3 měsících.";
        return "";
    }
    return "";
  }

  var fields = ["f-service", "f-date", "f-time", "f-name", "f-phone"].map(function (id) {
    return document.getElementById(id);
  });

  fields.forEach(function (input) {
    var evt = input.tagName === "SELECT" || input.type === "date" ? "change" : "blur";
    input.addEventListener(evt, function () { setError(input, validateField(input)); });
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") setError(input, validateField(input));
    });
  });

  var spz = document.getElementById("f-spz");
  spz.addEventListener("input", function () {
    var pos = spz.selectionStart;
    spz.value = spz.value.toUpperCase();
    try { spz.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var firstBad = null;
    fields.forEach(function (input) {
      var msg = validateField(input);
      setError(input, msg);
      if (msg && !firstBad) firstBad = input;
    });
    if (firstBad) {
      done.hidden = true;
      firstBad.focus();
      return;
    }

    var d = parseISO(dateInput.value);
    var txt = "Vybrali jste: " + form.service.value + ", " + dayNames[d.getDay()] + " " +
      d.toLocaleDateString("cs-CZ") + " v " + form.time.value + ".";
    summary.textContent = txt;
    done.hidden = false;
    done.focus();
    // Žádný backend – nic se neodesílá ani neukládá.
  });
})();
