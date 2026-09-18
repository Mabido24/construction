(function () {
  "use strict";

  // ---- Theme toggle (persisted, defaults to system) ----
  var root = document.documentElement;
  var THEME_KEY = "theme-pref";
  try {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) {}

  var themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme");
      var isDark = current ? current === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      var next = isDark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  // ---- Language menu ----
  var langSwitcher = document.querySelector("[data-lang-switcher]");
  if (langSwitcher) {
    var trigger = langSwitcher.querySelector("[data-lang-trigger]");
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      langSwitcher.classList.toggle("open");
    });
    document.addEventListener("click", function () {
      langSwitcher.classList.remove("open");
    });
  }

  // ---- Mobile nav ----
  var burger = document.querySelector("[data-burger]");
  var navLinks = document.querySelector(".nav-links");
  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      navLinks.classList.toggle("mobile-open");
    });
  }

  // ---- Reveal on scroll ----
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  // ---- Fan carousel (v2 profile-style homepage) ----
  var fanRoot = document.querySelector("[data-fan-carousel]");
  if (fanRoot) {
    var cards = Array.prototype.slice.call(fanRoot.querySelectorAll("[data-fan-card]"));
    var dots = document.querySelectorAll(".dash-progress span");
    var active = 0;

    var layout = function () {
      var n = cards.length;
      cards.forEach(function (card, i) {
        var diff = (i - active + n) % n;
        var pos = "far";
        if (diff === 0) pos = "active";
        else if (diff === 1) pos = "next";
        else if (diff === n - 1) pos = "prev";
        card.setAttribute("data-pos", pos);
      });
      dots.forEach(function (d, i) { d.classList.toggle("active", i === active); });
    };

    var go = function (delta) {
      active = (active + delta + cards.length) % cards.length;
      layout();
    };

    fanRoot.querySelector("[data-fan-prev]").addEventListener("click", function () { go(-1); });
    fanRoot.querySelector("[data-fan-next]").addEventListener("click", function () { go(1); });

    cards.forEach(function (card, i) {
      card.addEventListener("click", function () {
        if (i !== active) { active = i; layout(); return; }
        var href = card.getAttribute("data-href");
        if (href) window.location.href = href;
      });
    });

    // basic swipe support
    var startX = null;
    fanRoot.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    fanRoot.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
      startX = null;
    });

    layout();
  }

  // ---- Contact arc: 3-item window (prev / center / next) — arrows on desktop, swipe on touch ----
  var arcCarousel = document.querySelector("[data-arc-carousel]");
  if (arcCarousel) {
    var arcItems = Array.prototype.slice.call(arcCarousel.querySelectorAll("[data-arc-item]"));
    var arcActive = parseInt(arcCarousel.getAttribute("data-active"), 10) || 0;

    var renderArcSlot = function (slotName, item, isCenter) {
      var slot = arcCarousel.querySelector('[data-arc-slot="' + slotName + '"]');
      var href = item.getAttribute("data-href");
      var tone = item.getAttribute("data-tone");
      var label = item.getAttribute("data-label");
      var sub = item.getAttribute("data-sub");
      var svg = item.innerHTML;
      if (isCenter) {
        slot.innerHTML =
          '<a class="arc-item arc-center" href="' + href + '">' +
          '<span class="arc-icon-center">' + svg + '</span>' +
          '<span class="arc-label strong">' + label + '</span>' +
          '<span class="arc-sub">' + sub + '</span></a>';
      } else {
        slot.innerHTML =
          '<a class="arc-item" href="' + href + '">' +
          '<span class="arc-icon ' + tone + '">' + svg + '</span>' +
          '<span class="arc-label">' + label + '</span></a>';
      }
    };

    var renderArc = function () {
      var n = arcItems.length;
      renderArcSlot("prev", arcItems[(arcActive - 1 + n) % n], false);
      renderArcSlot("center", arcItems[arcActive], true);
      renderArcSlot("next", arcItems[(arcActive + 1) % n], false);
    };

    var shiftArc = function (delta) {
      arcActive = (arcActive + delta + arcItems.length) % arcItems.length;
      renderArc();
    };

    var arcPrevBtn = document.querySelector("[data-arc-prev]");
    var arcNextBtn = document.querySelector("[data-arc-next]");
    if (arcPrevBtn) arcPrevBtn.addEventListener("click", function () { shiftArc(-1); });
    if (arcNextBtn) arcNextBtn.addEventListener("click", function () { shiftArc(1); });

    var arcStartX = null;
    arcCarousel.addEventListener("touchstart", function (e) { arcStartX = e.touches[0].clientX; }, { passive: true });
    arcCarousel.addEventListener("touchend", function (e) {
      if (arcStartX === null) return;
      var dx = e.changedTouches[0].clientX - arcStartX;
      if (Math.abs(dx) > 40) shiftArc(dx > 0 ? -1 : 1);
      arcStartX = null;
    });

    renderArc();
  }

  // ---- Contact form: subject "other" reveal + submit ----
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var subjectSelect = form.querySelector('[name="subject"]');
    var otherField = form.querySelector("[data-other-field]");
    if (subjectSelect && otherField) {
      var toggleOther = function () {
        otherField.style.display = subjectSelect.value === "other" ? "block" : "none";
      };
      subjectSelect.addEventListener("change", toggleOther);
      toggleOther();
    }

    var msgBox = form.querySelector("[data-form-msg]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      var data = new FormData(form);

      fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            msgBox.className = "form-msg success";
            msgBox.textContent = form.getAttribute("data-success-text");
          } else {
            throw new Error("submit failed");
          }
        })
        .catch(function () {
          msgBox.className = "form-msg error";
          msgBox.textContent = form.getAttribute("data-error-text");
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });
  }
})();
