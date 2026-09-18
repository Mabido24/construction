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

  // ---- Homepage "Discover our work": horizontal vignette row, arrows flank the row ----
  var fanRoot = document.querySelector("[data-fan-carousel]");
  if (fanRoot) {
    var SERVICES = ["renovation", "construction", "domotics"];
    var active = SERVICES.indexOf("construction");

    var cards = fanRoot ? Array.prototype.slice.call(fanRoot.querySelectorAll("[data-fan-card]")) : [];
    var dots = document.querySelectorAll("[data-dash-progress] span");

    var render = function () {
      var n = SERVICES.length;
      if (cards.length) {
        cards.forEach(function (card) {
          var diff = (SERVICES.indexOf(card.getAttribute("data-service")) - active + n) % n;
          var pos = diff === 0 ? "active" : diff === 1 ? "next" : "prev";
          card.setAttribute("data-pos", pos);
        });
      }
      dots.forEach(function (d, i) { d.classList.toggle("active", i === active); });
    };

    var go = function (delta) {
      active = (active + delta + SERVICES.length) % SERVICES.length;
      render();
    };

    var prevBtn = document.querySelector("[data-fan-prev]");
    var nextBtn = document.querySelector("[data-fan-next]");
    if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        var service = card.getAttribute("data-service");
        if (SERVICES[active] !== service) { active = SERVICES.indexOf(service); render(); return; }
        var href = card.getAttribute("data-href");
        if (href) window.location.href = href;
      });
    });

    // swipe support (touch / PWA)
    var startX = null;
    fanRoot.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    fanRoot.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
      startX = null;
    });

    render();
  }

  // ---- Left-panel contact vignettes: independent 3-item arc (prev / center / next) ----
  var contactCarousel = document.querySelector("[data-contact-carousel]");
  if (contactCarousel) {
    var contactItems = Array.prototype.slice.call(document.querySelectorAll("[data-contact-item]"));
    var contactActive = 1; // default center = WhatsApp

    var renderContactSlot = function (slotName, item, isCenter) {
      var slot = document.querySelector('[data-contact-slot="' + slotName + '"]');
      if (!item || !slot) return;
      var href = item.getAttribute("data-href");
      var tone = item.getAttribute("data-tone");
      var label = item.getAttribute("data-label");
      var svg = item.innerHTML;
      if (isCenter) {
        slot.innerHTML =
          '<a class="arc-item arc-center" href="' + href + '" target="_blank" rel="noopener">' +
          '<span class="arc-icon-center">' + svg + '</span>' +
          '<span class="arc-label strong">' + label + '</span></a>';
      } else {
        slot.innerHTML =
          '<a class="arc-item" href="' + href + '" target="_blank" rel="noopener">' +
          '<span class="arc-icon ' + tone + '">' + svg + '</span>' +
          '<span class="arc-label">' + label + '</span></a>';
      }
    };

    var renderContact = function () {
      var n = contactItems.length;
      renderContactSlot("prev", contactItems[(contactActive - 1 + n) % n], false);
      renderContactSlot("center", contactItems[contactActive], true);
      renderContactSlot("next", contactItems[(contactActive + 1) % n], false);
    };

    var shiftContact = function (delta) {
      contactActive = (contactActive + delta + contactItems.length) % contactItems.length;
      renderContact();
    };

    var contactPrevBtn = document.querySelector("[data-contact-prev]");
    var contactNextBtn = document.querySelector("[data-contact-next]");
    if (contactPrevBtn) contactPrevBtn.addEventListener("click", function () { shiftContact(-1); });
    if (contactNextBtn) contactNextBtn.addEventListener("click", function () { shiftContact(1); });

    var contactStartX = null;
    contactCarousel.addEventListener("touchstart", function (e) { contactStartX = e.touches[0].clientX; }, { passive: true });
    contactCarousel.addEventListener("touchend", function (e) {
      if (contactStartX === null) return;
      var dx = e.changedTouches[0].clientX - contactStartX;
      if (Math.abs(dx) > 40) shiftContact(dx > 0 ? -1 : 1);
      contactStartX = null;
    });

    renderContact();
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
