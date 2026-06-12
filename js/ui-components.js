/**
 * SIGNATURE SPELL — Custom UI Components
 * Replaces native browser alert(), confirm(), and <select> elements
 * with beautifully styled, keyboard-accessible custom components.
 *
 * Exposed globals:
 *   window.showModal(message, options)          → replaces alert()
 *   window.showConfirm(message, options)        → replaces confirm(), returns Promise<boolean>
 *   window.initCustomSelect(selectEl, options)  → upgrades a <select> element
 *   window.initAllCustomSelects()               → upgrades all .ss-auto-select elements
 */

(function () {
  "use strict";

  // ─── MODAL SYSTEM ────────────────────────────────────────────────────────────

  /** Singleton backdrop element — created once, reused for every modal */
  let _backdropEl = null;
  let _activeResolve = null; // Promise resolver for confirm() modals

  function getBackdrop() {
    if (!_backdropEl) {
      _backdropEl = document.createElement("div");
      _backdropEl.className = "ss-modal-backdrop";
      _backdropEl.setAttribute("role", "dialog");
      _backdropEl.setAttribute("aria-modal", "true");
      document.body.appendChild(_backdropEl);

      // Close on backdrop click
      _backdropEl.addEventListener("click", function (e) {
        if (e.target === _backdropEl) {
          _closeModal(false);
        }
      });
    }
    return _backdropEl;
  }

  function _closeModal(result) {
    const bd = _backdropEl;
    if (!bd) return;
    bd.classList.remove("active");
    document.removeEventListener("keydown", _modalKeyHandler);

    // Restore focus to previously focused element
    if (_prevFocus && typeof _prevFocus.focus === "function") {
      _prevFocus.focus();
    }
    _prevFocus = null;

    if (typeof _activeResolve === "function") {
      _activeResolve(result);
      _activeResolve = null;
    }
  }

  let _prevFocus = null;

  function _modalKeyHandler(e) {
    const bd = _backdropEl;
    if (!bd || !bd.classList.contains("active")) return;

    if (e.key === "Escape") {
      e.preventDefault();
      _closeModal(false);
      return;
    }

    // Focus trap — cycle Tab within modal
    const focusables = Array.from(bd.querySelectorAll(
      "button:not([disabled]), [tabindex]:not([tabindex='-1'])"
    ));
    if (!focusables.length) return;

    if (e.key === "Tab") {
      e.preventDefault();
      const idx = focusables.indexOf(document.activeElement);
      const next = e.shiftKey
        ? focusables[(idx - 1 + focusables.length) % focusables.length]
        : focusables[(idx + 1) % focusables.length];
      if (next) next.focus();
    }

    if (e.key === "Enter") {
      const focused = document.activeElement;
      if (focused && bd.contains(focused) && focused.tagName === "BUTTON") {
        focused.click();
      }
    }
  }

  /**
   * Build and open a modal dialog.
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} opts.message
   * @param {string} opts.icon       — emoji or character
   * @param {string} opts.type       — 'success' | 'error' | 'warning' | 'info' | 'confirm'
   * @param {string} opts.confirmText
   * @param {string} opts.cancelText — if provided, shows a cancel button
   * @param {boolean} opts.dangerous  — use danger (red) style for confirm button
   * @param {Function} opts.onConfirm
   * @param {Function} opts.onCancel
   */
  function _openModal(opts) {
    _prevFocus = document.activeElement;

    const type        = opts.type || "info";
    const icon        = opts.icon || _defaultIcon(type);
    const title       = opts.title || _defaultTitle(type);
    const message     = opts.message || "";
    const confirmText = opts.confirmText || "OK";
    const cancelText  = opts.cancelText || null;
    const dangerous   = opts.dangerous || false;

    const bd = getBackdrop();
    bd.innerHTML = `
      <div class="ss-modal-card type-${type}" role="alertdialog" aria-labelledby="ss-modal-title" aria-describedby="ss-modal-msg">
        <button class="ss-modal-close-x" aria-label="Close" id="ss-modal-close-x-btn">&#x2715;</button>
        <span class="ss-modal-icon" aria-hidden="true">${icon}</span>
        <h3 class="ss-modal-title" id="ss-modal-title">${_escHtml(title)}</h3>
        <p class="ss-modal-message" id="ss-modal-msg">${_escHtml(message)}</p>
        <div class="ss-modal-actions">
          ${cancelText ? `<button class="ss-modal-btn ss-modal-btn-secondary" id="ss-modal-cancel">${_escHtml(cancelText)}</button>` : ""}
          <button class="ss-modal-btn ${dangerous ? "ss-modal-btn-danger" : "ss-modal-btn-primary"}" id="ss-modal-confirm">${_escHtml(confirmText)}</button>
        </div>
      </div>
    `;

    // Wire close X
    bd.querySelector("#ss-modal-close-x-btn").addEventListener("click", function () {
      _closeModal(false);
    });

    // Wire confirm button
    bd.querySelector("#ss-modal-confirm").addEventListener("click", function () {
      _closeModal(true);
      if (typeof opts.onConfirm === "function") opts.onConfirm();
    });

    // Wire cancel button (if present)
    const cancelBtn = bd.querySelector("#ss-modal-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        _closeModal(false);
        if (typeof opts.onCancel === "function") opts.onCancel();
      });
    }

    // Attach keyboard listener
    document.addEventListener("keydown", _modalKeyHandler);

    // Show
    requestAnimationFrame(function () {
      bd.classList.add("active");
      // Focus confirm button for keyboard users
      const confirmBtn = bd.querySelector("#ss-modal-confirm");
      if (confirmBtn) confirmBtn.focus();
    });
  }

  function _defaultIcon(type) {
    return { success: "✨", error: "⚠️", warning: "⚠️", info: "💬", confirm: "🤔" }[type] || "💬";
  }

  function _defaultTitle(type) {
    return { success: "Success!", error: "Something went wrong", warning: "Warning", info: "Notice", confirm: "Are you sure?" }[type] || "Notice";
  }

  function _escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * showModal — replaces native alert()
   * @param {string} message
   * @param {object} [options] — { title, type, icon, confirmText }
   */
  window.showModal = function (message, options) {
    options = options || {};
    _openModal({
      message:     message,
      title:       options.title,
      type:        options.type || "info",
      icon:        options.icon,
      confirmText: options.confirmText || "Got it",
    });
  };

  /**
   * showConfirm — replaces native confirm()
   * Returns a Promise<boolean> — true if user clicked confirm, false if cancelled.
   * @param {string} message
   * @param {object} [options] — { title, type, confirmText, cancelText, dangerous }
   */
  window.showConfirm = function (message, options) {
    options = options || {};
    return new Promise(function (resolve) {
      _activeResolve = resolve;
      _openModal({
        message:     message,
        title:       options.title || "Are you sure?",
        type:        options.type || "confirm",
        icon:        options.icon || "🤔",
        confirmText: options.confirmText || "Yes, proceed",
        cancelText:  options.cancelText || "Cancel",
        dangerous:   options.dangerous || false,
      });
    });
  };

  // ─── CUSTOM SELECT DROPDOWN ──────────────────────────────────────────────────

  /** Track currently open dropdown to close it when another opens */
  let _openSelect = null;

  /**
   * Closes currently open dropdown (if any).
   */
  function _closeAllSelects(except) {
    if (_openSelect && _openSelect !== except) {
      _openSelect.classList.remove("open");
      _openSelect = null;
    }
  }

  // Close on outside click
  document.addEventListener("click", function (e) {
    if (_openSelect && !_openSelect.contains(e.target)) {
      _openSelect.classList.remove("open");
      _openSelect = null;
    }
  });

  /**
   * initCustomSelect — upgrades a <select> element into a custom dropdown.
   * The original <select> is hidden but kept in the DOM for form submission.
   *
   * @param {HTMLSelectElement} selectEl  — the native <select> to upgrade
   * @param {object} [opts]
   * @param {string} [opts.size]          — 'normal' | 'compact' | 'small'
   * @param {string} [opts.placeholder]   — text shown when no option is selected
   */
  window.initCustomSelect = function (selectEl, opts) {
    if (!selectEl || selectEl._ssInitialized) return;
    if (selectEl.tagName !== "SELECT") return;
    selectEl._ssInitialized = true;

    opts = opts || {};
    const size = opts.size || "normal";

    // Mark native select so CSS hides it
    selectEl.classList.add("ss-select-native");

    // Build wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "ss-select" + (size !== "normal" ? " " + size : "");
    // Mirror any additional classes from the original select (except native)
    const mirrorClasses = ["form-group-select", "sort-select", "admin-status-select"];
    mirrorClasses.forEach(function (cls) {
      if (selectEl.classList.contains(cls)) wrapper.classList.add("ss-" + cls);
    });
    // Copy data attributes
    Array.from(selectEl.attributes).forEach(function (attr) {
      if (attr.name.startsWith("data-")) {
        wrapper.setAttribute(attr.name, attr.value);
      }
    });

    // Insert wrapper before the select, then move select inside
    selectEl.parentNode.insertBefore(wrapper, selectEl);
    wrapper.appendChild(selectEl);

    // Build trigger button
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ss-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    if (selectEl.id) trigger.setAttribute("aria-controls", selectEl.id + "-dropdown");

    const valueEl = document.createElement("span");
    valueEl.className = "ss-select-value";
    trigger.appendChild(valueEl);

    const arrowEl = document.createElement("span");
    arrowEl.className = "ss-select-arrow";
    arrowEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    trigger.appendChild(arrowEl);

    wrapper.appendChild(trigger);

    // Build dropdown panel
    const dropdown = document.createElement("div");
    dropdown.className = "ss-select-dropdown";
    dropdown.setAttribute("role", "listbox");
    if (selectEl.id) dropdown.id = selectEl.id + "-dropdown";
    wrapper.appendChild(dropdown);

    // Sync options from native select into custom dropdown
    function syncOptions() {
      dropdown.innerHTML = "";
      const options = Array.from(selectEl.options);
      options.forEach(function (opt, idx) {
        if (opt.disabled && opt.value === "") {
          // It's a placeholder option — skip rendering as a list item
          return;
        }
        const item = document.createElement("div");
        item.className = "ss-select-option" +
          (opt.selected ? " selected" : "") +
          (opt.disabled ? "" : "");
        if (opt.disabled) item.setAttribute("data-disabled", "");
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", opt.selected ? "true" : "false");
        item.setAttribute("data-value", opt.value);
        item.textContent = opt.textContent;
        item._optionIndex = idx;

        if (!opt.disabled) {
          item.addEventListener("click", function () {
            selectOption(idx);
            close();
          });
        }
        dropdown.appendChild(item);
      });
      updateTriggerLabel();
    }

    function updateTriggerLabel() {
      const selected = selectEl.options[selectEl.selectedIndex];
      const isPlaceholder = selected && selected.disabled && selected.value === "";
      if (selected && !isPlaceholder) {
        valueEl.textContent = selected.textContent;
        valueEl.classList.remove("placeholder");
      } else {
        const ph = opts.placeholder || selectEl.getAttribute("data-placeholder") || "Select an option";
        valueEl.textContent = ph;
        valueEl.classList.add("placeholder");
      }
    }

    function selectOption(idx) {
      selectEl.selectedIndex = idx;
      // Fire change event so any listeners are notified
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      // Update custom UI
      Array.from(dropdown.querySelectorAll(".ss-select-option")).forEach(function (el) {
        const isSelected = parseInt(el._optionIndex) === idx;
        el.classList.toggle("selected", isSelected);
        el.setAttribute("aria-selected", isSelected ? "true" : "false");
      });
      updateTriggerLabel();
    }

    function open() {
      _closeAllSelects(wrapper);
      wrapper.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      _openSelect = wrapper;
      // Scroll selected item into view
      const selectedItem = dropdown.querySelector(".selected");
      if (selectedItem) selectedItem.scrollIntoView({ block: "nearest" });
    }

    function close() {
      wrapper.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
      if (_openSelect === wrapper) _openSelect = null;
      trigger.focus();
    }

    // Keyboard navigation state
    let _focusedIdx = -1;

    function _getNavigableItems() {
      return Array.from(dropdown.querySelectorAll(".ss-select-option:not([data-disabled])"));
    }

    function _setFocusedItem(items, idx) {
      items.forEach(function (el) { el.classList.remove("focused"); });
      _focusedIdx = idx;
      if (idx >= 0 && idx < items.length) {
        items[idx].classList.add("focused");
        items[idx].scrollIntoView({ block: "nearest" });
      }
    }

    // Trigger: click opens/closes
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      if (wrapper.classList.contains("open")) {
        close();
      } else {
        syncOptions();
        open();
        _focusedIdx = -1;
      }
    });

    // Keyboard on trigger
    trigger.addEventListener("keydown", function (e) {
      const isOpen = wrapper.classList.contains("open");
      const items = _getNavigableItems();

      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          syncOptions();
          open();
          _focusedIdx = -1;
        }
        if (e.key === "ArrowDown") {
          _setFocusedItem(items, Math.min(_focusedIdx + 1, items.length - 1));
        }
      } else if (e.key === "ArrowUp" && isOpen) {
        e.preventDefault();
        _setFocusedItem(items, Math.max(_focusedIdx - 1, 0));
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      } else if (e.key === "Tab" && isOpen) {
        close();
      } else if (e.key === "Enter" && isOpen) {
        e.preventDefault();
        if (_focusedIdx >= 0 && items[_focusedIdx]) {
          items[_focusedIdx].click();
        }
      }
    });

    // Keyboard on dropdown panel
    dropdown.addEventListener("keydown", function (e) {
      const items = _getNavigableItems();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        _setFocusedItem(items, Math.min(_focusedIdx + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        _setFocusedItem(items, Math.max(_focusedIdx - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (_focusedIdx >= 0 && items[_focusedIdx]) {
          items[_focusedIdx].click();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });

    // If the underlying native select changes programmatically, sync the UI
    selectEl.addEventListener("change", function () {
      updateTriggerLabel();
    });

    // Initial sync
    syncOptions();

    // Store a public refresh method on the wrapper (for dynamic option updates)
    wrapper.refresh = syncOptions;

    return wrapper;
  };

  /**
   * initAllCustomSelects — upgrades all <select> elements with the class
   * "ss-auto-select" or data-ss-select attribute automatically.
   */
  window.initAllCustomSelects = function () {
    document.querySelectorAll("select[data-ss-select]").forEach(function (el) {
      const size = el.getAttribute("data-ss-select") || "normal";
      window.initCustomSelect(el, { size: size });
    });
  };

  // Auto-init on DOM ready
  document.addEventListener("DOMContentLoaded", function () {
    window.initAllCustomSelects();
  });

})();
