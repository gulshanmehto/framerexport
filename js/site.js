// Lightweight replacement for Framer's React/Motion runtime.
// Handles: (1) fade/slide-in "appear" animations that were previously driven
// by script_main.*.mjs, and (2) the mobile/desktop "Menu" dropdown toggle.
// No external dependencies, no network calls.
(function () {
  "use strict";

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // ---------- 1. Scroll/entrance reveal ----------
  // Framer's export leaves entrance-hidden elements with an inline style like
  // opacity:0 (or 0.001) and, often, a translateX/Y(...) offset. We reveal
  // them as they enter the viewport. Only plain pixel translate offsets are
  // reset to "none" on reveal; anything else (percentage-based centering
  // transforms, compound transforms, etc.) is left alone so we never break
  // an element's actual layout, and we only ever touch opacity for those.
  var SAFE_TRANSFORM_RESET = /^(translate[xy]?\(-?[\d.]+px(?:,\s*-?[\d.]+px)?\)\s*)+$/i;

  function initReveal() {
    var candidates = document.querySelectorAll("[style]");
    var targets = [];

    candidates.forEach(function (el) {
      if (el.hasAttribute("data-site-js-managed")) return;
      var style = el.getAttribute("style") || "";
      var m = style.match(/(?:^|;)\s*opacity:\s*(0(?:\.\d+)?)\s*(?:;|$)/i);
      if (!m) return;
      if (parseFloat(m[1]) >= 1) return;
      targets.push(el);
    });

    if (!targets.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -5% 0px" }
    );

    targets.forEach(function (el) {
      el.style.transition =
        (el.style.transition ? el.style.transition + ", " : "") + "opacity 0.6s cubic-bezier(.16,1,.3,1)";
      io.observe(el);
    });

    function reveal(el) {
      // Snap the transform immediately (no transition on it) so we never
      // leave a large subtree mid-transform-transition, which some
      // software-rendered browsers rasterize at reduced quality; only
      // opacity animates smoothly.
      var t = (el.style.transform || "").trim();
      if (t && SAFE_TRANSFORM_RESET.test(t)) {
        el.style.transform = "none";
      }
      requestAnimationFrame(function () {
        el.style.opacity = "1";
      });
      window.setTimeout(function () {
        el.style.transition = "";
      }, 700);
    }
  }

  // ---------- 2. Menu dropdown toggle ----------
  // The "Menu" pill button and its dropdown panel are siblings somewhere
  // under a shared ancestor. We find that ancestor generically (rather than
  // relying on per-page hashed class names) by walking up from the button
  // until we find a container that also holds a "Bottom" nav-menu panel.
  function initMenus() {
    var buttons = Array.prototype.filter.call(
      document.querySelectorAll('[data-highlight="true"]'),
      function (el) {
        return el.textContent.trim() === "Menu" && el.querySelector("*");
      }
    );

    buttons.forEach(function (btn) {
      var panel = null;
      var node = btn;
      while (node && node !== document.body) {
        var candidate = node.querySelector('[data-framer-name="Bottom"]');
        if (candidate) {
          var style = candidate.getAttribute("style") || "";
          if (/opacity:\s*0\b/.test(style)) {
            panel = candidate;
            break;
          }
        }
        node = node.parentElement;
      }
      if (!panel) return;
      panel.setAttribute("data-site-js-managed", "true");

      btn.style.cursor = "pointer";
      var open = false;
      function setOpen(next) {
        open = next;
        panel.style.opacity = open ? "1" : "0";
        panel.style.pointerEvents = open ? "auto" : "none";
      }
      setOpen(false);
      btn.addEventListener("click", function () {
        setOpen(!open);
      });
      // Close the dropdown after a nav link inside it is used.
      panel.querySelectorAll("a[href]").forEach(function (a) {
        a.addEventListener("click", function () {
          setOpen(false);
        });
      });
    });
  }

  onReady(function () {
    initMenus();
    initReveal();
  });
})();
