/* =========================================================================
   UI primitives — modal, confirmation, toast, small helpers.
   Shared by every view so the interaction patterns stay identical.
   ========================================================================= */
var UI = (function () {

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------------------------- modal */
  var openStack = [];

  /**
   * UI.modal({ title, body, size, footer, onMount(root, close), onClose })
   * returns a close() function.
   */
  function modal(opts) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-root';
    overlay.innerHTML =
      '<div class="modal' + (opts.size === 'sm' ? ' is-sm' : '') + '" role="dialog" aria-modal="true">' +
        (opts.title
          ? '<div class="modal-head">' +
              '<button class="iconbtn modal-close" type="button" data-close aria-label="Close">' + Icons.svg('close') + '</button>' +
              '<h2 class="modal-title">' + esc(opts.title) + '</h2>' +
            '</div>'
          : '') +
        (opts.raw ? opts.body : '<div class="modal-body">' + (opts.body || '') + '</div>') +
        (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '') +
      '</div>';

    document.body.appendChild(overlay);
    openStack.push(overlay);

    function close() {
      var i = openStack.indexOf(overlay);
      if (i === -1) return;
      openStack.splice(i, 1);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (opts.onClose) opts.onClose();
    }

    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay && opts.dismissible !== false) close();
    });
    var closers = overlay.querySelectorAll('[data-close]');
    for (var c = 0; c < closers.length; c++) {
      closers[c].addEventListener('click', close);
    }

    Icons.hydrate(overlay);
    if (opts.onMount) opts.onMount(overlay.querySelector('.modal'), close);

    var focusable = overlay.querySelector('input,select,textarea,button:not([data-close])');
    if (focusable) focusable.focus();

    return close;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openStack.length) {
      var top = openStack[openStack.length - 1];
      var btn = top.querySelector('[data-close]');
      if (btn) btn.click();
    }
  });

  /* ------------------------------------------------------------- confirm */
  /**
   * UI.confirm({ title, html, confirmLabel, cancelLabel, danger })
   * -> Promise<boolean>
   */
  function confirm(opts) {
    return new Promise(function (resolve) {
      var answered = false;
      var close = modal({
        title: opts.title,
        raw: true,
        dismissible: false,
        body:
          '<div class="confirm-body">' +
            '<div class="confirm-ico' + (opts.danger ? ' is-danger' : '') + '">' +
              Icons.svg('warning') +
            '</div>' +
            '<div class="confirm-text">' + opts.html + '</div>' +
          '</div>',
        footer:
          '<button class="btn btn-flat" type="button" data-act="cancel">' +
            esc(opts.cancelLabel || 'CANCEL') + '</button>' +
          '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" type="button" data-act="ok">' +
            esc(opts.confirmLabel || 'CONFIRM') + '</button>',
        onMount: function (root, closeFn) {
          root.querySelector('[data-act="cancel"]').addEventListener('click', function () {
            answered = true; closeFn(); resolve(false);
          });
          root.querySelector('[data-act="ok"]').addEventListener('click', function () {
            answered = true; closeFn(); resolve(true);
          });
        },
        onClose: function () { if (!answered) resolve(false); }
      });
      void close;
    });
  }

  /* --------------------------------------------------------------- toast */
  function toast(message, type) {
    var root = document.getElementById('toastRoot');
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' is-error' : type === 'warn' ? ' is-warn' : '');
    el.innerHTML =
      '<span class="ico">' + Icons.svg(type === 'success' || !type ? 'check' : 'warning') + '</span>' +
      '<span>' + esc(message) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .2s';
      el.style.opacity = '0';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, type === 'error' ? 5200 : 3600);
  }

  /* --------------------------------------------------------- misc helpers */
  function on(root, selector, event, handler) {
    root.addEventListener(event, function (e) {
      var t = e.target.closest ? e.target.closest(selector) : null;
      if (t && root.contains(t)) handler(e, t);
    });
  }

  function plural(n, one, many) { return n === 1 ? one : many; }

  return { esc: esc, modal: modal, confirm: confirm, toast: toast, on: on, plural: plural };
})();
