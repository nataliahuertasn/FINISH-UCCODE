/* =========================================================================
   VARIABLES FINISH & UC CODE
   -------------------------------------------------------------------------
   Catalog administration. One block per section (Supplier, AAMA, Covering),
   each with "+ NEW" and a pencil that shows/hides the per-value actions.

   Per value:
     pencil  -> rename / replace the value (propagates everywhere)
     eye     -> disable / enable (hidden for new records, history preserved)
     X       -> delete (guarded: warns about the records that will be left
                blank, then clears only that field on those records)
   ========================================================================= */
var VariablesView = (function () {

  var host = null;
  var unsub = null;
  var manage = {};          // sectionKey -> true while the section pencil is on
                            // (off by default: chips stay clean until you ask to edit)

  /* ------------------------------------------------------------- render */
  function chip(v, showActions) {
    var used = Store.usageCount(v.id);
    var off = v.status === 'disabled';

    var actions = '';
    if (showActions) {
      actions =
        '<span class="chip-actions">' +
          '<button class="iconbtn" type="button" data-act="rename" title="Rename value">' + Icons.svg('edit') + '</button>' +
          '<button class="iconbtn" type="button" data-act="status" title="' +
            (off ? 'Enable — make it selectable again' : 'Disable — hide it from new records') + '">' +
            Icons.svg(off ? 'eye' : 'eyeoff') + '</button>' +
          '<button class="iconbtn is-danger" type="button" data-act="delete" title="Delete value">' + Icons.svg('close') + '</button>' +
        '</span>';
    }

    return '<span class="chip' + (off ? ' is-disabled' : '') + (showActions ? '' : ' no-actions') + '" data-id="' + v.id + '">' +
      '<span class="chip-name">' + UI.esc(v.name) + '</span>' +
      (off ? '<span class="chip-state">disabled</span>' : '') +
      (showActions && used ? '<span class="chip-usage" title="Used by ' + used + ' record(s)">' + used + '</span>' : '') +
      actions +
    '</span>';
  }

  function sectionBlock(sec) {
    var all = Store.variablesOf(sec.key);
    var show = manage[sec.key] === true;

    var chips = all.length
      ? all.map(function (v) { return chip(v, show); }).join('')
      : '<div class="chips-empty">No values registered yet. Use <b>+ NEW</b> to add the first one.</div>';

    return '' +
    '<section class="varsec" data-section="' + sec.key + '">' +
      '<div class="varsec-head">' +
        '<h2 class="varsec-name">' + UI.esc(sec.label) + '</h2>' +
        '<div class="spacer"></div>' +
        '<button class="btn btn-primary" type="button" data-act="add">+ NEW</button>' +
        '<button class="iconbtn is-primary' + (show ? ' is-on' : '') + '" type="button" data-act="manage" ' +
          'title="' + (show ? 'Done editing' : 'Edit values') + '" aria-pressed="' + show + '">' +
          Icons.svg('edit') + '</button>' +
      '</div>' +
      '<div class="chips">' + chips + '</div>' +
    '</section>';
  }

  function render() {
    host.innerHTML =
      '<div class="page">' +
        '<h1 class="section-title">VARIABLES FINISH &amp; UC CODE</h1>' +
        '<div class="rule"></div>' +
        Store.sections().map(sectionBlock).join('') +
      '</div>';
    Icons.hydrate(host);
  }

  /* -------------------------------------------------------- name prompt */
  function namePrompt(opts) {
    return new Promise(function (resolve) {
      var done = false;
      UI.modal({
        title: opts.title,
        size: 'sm',
        body:
          (opts.help ? '<p class="muted" style="margin:0 0 6px;line-height:1.55">' + opts.help + '</p>' : '') +
          '<div class="field">' +
            '<div class="field-ico">' + Icons.svg('tag') + '</div>' +
            '<div class="field-main">' +
              '<label class="field-label" for="v_name">' + UI.esc(opts.label) + '<span class="req">*</span></label>' +
              '<input id="v_name" type="text" value="' + UI.esc(opts.value || '') + '" autocomplete="off">' +
              '<div class="field-err" hidden></div>' +
            '</div>' +
          '</div>',
        footer: '<button class="btn btn-flat" type="button" data-close>CANCEL</button>' +
                '<button class="btn btn-primary" type="button" data-act="save">' + UI.esc(opts.cta || 'SAVE') + '</button>',
        onMount: function (root, close) {
          var input = root.querySelector('#v_name');
          var err = root.querySelector('.field-err');
          var save = root.querySelector('[data-act="save"]');

          function submit() {
            var val = input.value.trim();
            if (!val) {
              err.textContent = 'The value is required.';
              err.hidden = false;
              root.querySelector('.field').classList.add('has-error');
              input.focus();
              return;
            }
            save.disabled = true;
            opts.onSubmit(val).then(function () {
              done = true; close(); resolve(true);
            }).catch(function (e) {
              save.disabled = false;
              err.textContent = e.message || 'The value could not be saved.';
              err.hidden = false;
              root.querySelector('.field').classList.add('has-error');
            });
          }

          save.addEventListener('click', submit);
          input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
          input.addEventListener('input', function () {
            err.hidden = true;
            root.querySelector('.field').classList.remove('has-error');
          });
          input.select();
        },
        onClose: function () { if (!done) resolve(false); }
      });
    });
  }

  /* -------------------------------------------------------------- actions */
  function addValue(sec) {
    namePrompt({
      title: 'New ' + sec.label + ' value',
      label: sec.label + ' value',
      cta: 'SAVE',
      onSubmit: function (name) {
        return Api.variables.create(sec.key, name).then(function (row) {
          return Store.refresh().then(function () {
            UI.toast('"' + row.name + '" added.');
          });
        });
      }
    });
  }

  function renameValue(v, sec) {
    namePrompt({
      title: 'Rename ' + sec.label + ' value',
      label: sec.label + ' value',
      value: v.name,
      cta: 'SAVE',
      help: 'This value will be replaced in all previously registered finishes.',
      onSubmit: function (name) {
        var old = v.name;
        return Api.variables.rename(v.id, name).then(function (row) {
          return Store.refresh().then(function () {
            UI.toast('"' + old + '" renamed to "' + row.name + '".');
          });
        });
      }
    });
  }

  function toggleStatus(v, sec) {
    var off = v.status === 'disabled';

    if (off) {
      Api.variables.setStatus(v.id, 'active')
        .then(function () { return Store.refresh(); })
        .then(function () { UI.toast('"' + v.name + '" enabled.'); })
        .catch(function (e) { UI.toast(e.message, 'error'); });
      return;
    }

    UI.confirm({
      title: 'Disable value?',
      confirmLabel: 'DISABLE',
      html: '<p>It will not be available for new finishes. Previously registered ' +
            'finishes keep this value.</p>'
    }).then(function (yes) {
      if (!yes) return;
      Api.variables.setStatus(v.id, 'disabled')
        .then(function () { return Store.refresh(); })
        .then(function () { UI.toast('"' + v.name + '" disabled.'); })
        .catch(function (e) { UI.toast(e.message, 'error'); });
    });
  }

  function deleteValue(v, sec) {
    var used = Store.usageCount(v.id);

    var html = used
      ? '<p>It is used by <b>' + used + '</b> registered ' + UI.plural(used, 'finish', 'finishes') +
        '. Deleting it leaves that field blank on ' + UI.plural(used, 'it', 'them') + '.</p>'
      : '<p>This value will be permanently deleted.</p>';

    UI.confirm({
      title: 'Delete variable?',
      danger: true,
      confirmLabel: 'DELETE',
      html: html
    }).then(function (yes) {
      if (!yes) return;
      Api.variables.remove(v.id)
        .then(function (res) {
          return Store.refresh().then(function () {
            UI.toast('"' + res.name + '" deleted.', res.clearedRecords ? 'warn' : 'success');
          });
        })
        .catch(function (e) { UI.toast(e.message, 'error'); });
    });
  }

  /* --------------------------------------------------------------- mount */
  function mount(container) {
    host = container;
    render();

    UI.on(host, '[data-act="add"]', 'click', function (e, btn) {
      addValue(Store.section(btn.closest('[data-section]').getAttribute('data-section')));
    });

    UI.on(host, '[data-act="manage"]', 'click', function (e, btn) {
      var key = btn.closest('[data-section]').getAttribute('data-section');
      manage[key] = !manage[key];
      render();
    });

    UI.on(host, '[data-act="rename"]', 'click', function (e, btn) {
      var id = btn.closest('.chip').getAttribute('data-id');
      var key = btn.closest('[data-section]').getAttribute('data-section');
      renameValue(Store.variable(id), Store.section(key));
    });

    UI.on(host, '[data-act="status"]', 'click', function (e, btn) {
      var id = btn.closest('.chip').getAttribute('data-id');
      var key = btn.closest('[data-section]').getAttribute('data-section');
      toggleStatus(Store.variable(id), Store.section(key));
    });

    UI.on(host, '[data-act="delete"]', 'click', function (e, btn) {
      var id = btn.closest('.chip').getAttribute('data-id');
      var key = btn.closest('[data-section]').getAttribute('data-section');
      deleteValue(Store.variable(id), Store.section(key));
    });

    unsub = Store.subscribe(function () { if (host) render(); });
  }

  function unmount() {
    if (unsub) { unsub(); unsub = null; }
    host = null;
  }

  return { mount: mount, unmount: unmount };
})();
