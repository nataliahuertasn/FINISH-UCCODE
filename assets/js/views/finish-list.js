/* =========================================================================
   MAIN VIEW — FINISH & UC CODE
   Table of registered finishes + NEW / IMPORT / EXPORT, per-column filters,
   ENABLED switch and row actions, as in the current screen.
   ========================================================================= */
var FinishListView = (function () {

  var host = null;
  var unsub = null;
  var filters = { name: '', consecutive: '', supplier: '', aama: '', covering: '', description: '' };
  var search = '';

  /* --------------------------------------------------------------- utils */
  function cellFor(record, sec) {
    var id = record[sec.field];
    var v = Store.variable(id);
    if (!v) return '<span class="cell-empty">&mdash;</span>';
    return UI.esc(v.name) +
      (v.status === 'disabled' ? '<span class="tag-off" title="This value was disabled in Variables. Historical data is kept.">disabled</span>' : '');
  }

  function textFor(record, sec) {
    var v = Store.variable(record[sec.field]);
    return v ? v.name : '';
  }

  function visibleRows() {
    var rows = Store.finishCodes();
    var q = search.trim().toLowerCase();

    return rows.filter(function (r) {
      var sup = textFor(r, Store.section('supplier'));
      var aam = textFor(r, Store.section('aama'));
      var cov = textFor(r, Store.section('covering'));

      function has(val, f) { return !f || String(val).toLowerCase().indexOf(f.toLowerCase()) !== -1; }

      if (!has(r.name, filters.name)) return false;
      if (!has(r.consecutive, filters.consecutive)) return false;
      if (!has(sup, filters.supplier)) return false;
      if (!has(aam, filters.aama)) return false;
      if (!has(cov, filters.covering)) return false;
      if (!has(r.description, filters.description)) return false;

      if (q) {
        var blob = [r.name, r.consecutive, sup, aam, cov, r.description].join(' ').toLowerCase();
        if (blob.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  /* ------------------------------------------------------------ skeleton */
  function skeleton() {
    return '' +
    '<div class="page">' +
      '<div class="card">' +
        '<div class="page-head">' +
          '<h1 class="page-title">FINISH &amp; UC CODE</h1>' +
          '<div class="page-actions">' +
            '<button class="btn btn-primary" type="button" data-act="new">' +
              '<span class="ico">' + Icons.svg('add') + '</span> NEW</button>' +
            '<button class="btn btn-green" type="button" data-act="import">' +
              '<span class="ico">' + Icons.svg('file') + '</span> IMPORT</button>' +
            '<button class="btn btn-primary" type="button" data-act="export">' +
              '<span class="ico">' + Icons.svg('file') + '</span> EXPORT</button>' +
          '</div>' +
          '<div class="spacer"></div>' +
        '</div>' +

        '<div class="table-wrap">' +
          '<table class="grid">' +
            '<thead><tr>' +
              th('UC CODE', 'name') +
              th('CONSECUTIVE', 'consecutive') +
              th('SUPPLIER', 'supplier') +
              th('AAMA', 'aama') +
              th('COVERING', 'covering') +
              th('DESCRIPTION', 'description') +
              '<th class="col-enabled"><span class="th-label">ENABLED</span></th>' +
              '<th class="col-actions"><span class="th-label">ACTIONS</span></th>' +
            '</tr></thead>' +
            '<tbody data-body></tbody>' +
          '</table>' +
        '</div>' +

        '<div class="table-foot">' +
          '<span data-count></span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function th(label, key) {
    return '<th><span class="th-label">' + label + '</span>' +
      '<input class="th-filter" type="text" data-filter="' + key + '" ' +
      'value="' + UI.esc(filters[key]) + '" aria-label="Filter by ' + label + '"></th>';
  }

  /* ----------------------------------------------------------- body only */
  function renderBody() {
    var tbody = host.querySelector('[data-body]');
    var rows = visibleRows();
    var secSup = Store.section('supplier'),
        secAam = Store.section('aama'),
        secCov = Store.section('covering');

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty">No records match the current filters.</td></tr>';
    } else {
      tbody.innerHTML = rows.map(function (r) {
        return '<tr' + (r.enabled ? '' : ' class="is-off"') + ' data-id="' + r.id + '">' +
          '<td>' + UI.esc(r.name) + '</td>' +
          '<td>' + UI.esc(r.consecutive) + '</td>' +
          '<td>' + cellFor(r, secSup) + '</td>' +
          '<td>' + cellFor(r, secAam) + '</td>' +
          '<td>' + cellFor(r, secCov) + '</td>' +
          '<td class="cell-desc">' + (r.description ? UI.esc(r.description) : '<span class="cell-empty">&mdash;</span>') + '</td>' +
          '<td class="col-enabled">' +
            '<label class="switch" title="' + (r.enabled ? 'Enabled' : 'Disabled') + '">' +
              '<input type="checkbox" data-act="toggle"' + (r.enabled ? ' checked' : '') + '>' +
              '<span class="track"></span><span class="knob"></span>' +
            '</label>' +
          '</td>' +
          '<td class="col-actions">' +
            '<button class="iconbtn" type="button" data-act="edit" title="Edit">' + Icons.svg('edit') + '</button>' +
            '<button class="iconbtn is-danger" type="button" data-act="delete" title="Delete">' + Icons.svg('trash') + '</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    var total = Store.finishCodes().length;
    host.querySelector('[data-count]').textContent =
      rows.length === total
        ? total + ' ' + UI.plural(total, 'record', 'records')
        : rows.length + ' of ' + total + ' records';
  }

  /* --------------------------------------------------------------- CSV */
  function toCsv(rows) {
    var secSup = Store.section('supplier'),
        secAam = Store.section('aama'),
        secCov = Store.section('covering');
    var head = ['UC CODE', 'CONSECUTIVE', 'SUPPLIER', 'AAMA', 'COVERING', 'DESCRIPTION', 'ENABLED'];
    var lines = [head.join(',')];
    rows.forEach(function (r) {
      lines.push([
        r.name, r.consecutive,
        textFor(r, secSup), textFor(r, secAam), textFor(r, secCov),
        r.description, r.enabled ? 'TRUE' : 'FALSE'
      ].map(function (v) {
        v = String(v === null || v === undefined ? '' : v);
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(','));
    });
    return lines.join('\r\n');
  }

  function parseCsv(text) {
    var rows = [], row = [], cur = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.join('').trim() !== ''; });
  }

  function doExport() {
    var rows = visibleRows();
    var blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'finish-and-uc-code.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    UI.toast(rows.length + ' ' + UI.plural(rows.length, 'finish', 'finishes') + ' exported.');
  }

  function doImport() {
    UI.modal({
      title: 'Import Finish & UC Code',
      size: 'sm',
      body:
        '<p class="muted" style="margin:0 0 14px;line-height:1.6">' +
          'Expected columns: <b>UC CODE, CONSECUTIVE, SUPPLIER, AAMA, COVERING, DESCRIPTION</b>.' +
        '</p>' +
        '<input type="file" accept=".csv,text/csv" data-file>',
      footer: '<button class="btn btn-flat" type="button" data-close>CANCEL</button>' +
              '<button class="btn btn-green" type="button" data-act="go" disabled>IMPORT</button>',
      onMount: function (root, close) {
        var file = root.querySelector('[data-file]');
        var go = root.querySelector('[data-act="go"]');
        file.addEventListener('change', function () { go.disabled = !file.files.length; });
        go.addEventListener('click', function () {
          var reader = new FileReader();
          reader.onload = function () {
            var table = parseCsv(String(reader.result));
            if (table.length < 2) { UI.toast('The file has no data rows.', 'error'); return; }
            var body = table.slice(1).map(function (c) {
              return {
                name: (c[0] || '').trim(), consecutive: (c[1] || '').trim(),
                supplier: (c[2] || '').trim(), aama: (c[3] || '').trim(),
                covering: (c[4] || '').trim(), description: (c[5] || '').trim()
              };
            });
            Api.finishCodes.importRows(body).then(function (res) {
              close();
              return Store.refresh().then(function () {
                UI.toast(res.added + ' ' + UI.plural(res.added, 'finish', 'finishes') + ' imported.',
                  res.unmatched ? 'warn' : 'success');
              });
            }).catch(function (e) { UI.toast(e.message, 'error'); });
          };
          reader.readAsText(file.files[0]);
        });
      }
    });
  }

  /* -------------------------------------------------------------- mount */
  function mount(container) {
    host = container;
    host.innerHTML = skeleton();
    Icons.hydrate(host);
    renderBody();

    UI.on(host, '[data-act="new"]', 'click', function () { FinishForm.open(null); });
    UI.on(host, '[data-act="export"]', 'click', doExport);
    UI.on(host, '[data-act="import"]', 'click', doImport);

    host.addEventListener('input', function (e) {
      var f = e.target.closest ? e.target.closest('[data-filter]') : null;
      if (!f) return;
      filters[f.getAttribute('data-filter')] = f.value;
      renderBody();
    });

    UI.on(host, '[data-act="edit"]', 'click', function (e, btn) {
      var id = btn.closest('tr').getAttribute('data-id');
      FinishForm.open(Store.finishCode(id));
    });

    UI.on(host, '[data-act="delete"]', 'click', function (e, btn) {
      var id = btn.closest('tr').getAttribute('data-id');
      var rec = Store.finishCode(id);
      UI.confirm({
        title: 'Delete record?',
        danger: true,
        confirmLabel: 'DELETE',
        html: '<p>This finish will be permanently deleted.</p>'
      }).then(function (yes) {
        if (!yes) return;
        Api.finishCodes.remove(id)
          .then(function () { return Store.refresh(); })
          .then(function () { UI.toast('"' + rec.name + '" deleted.'); })
          .catch(function (err) { UI.toast(err.message, 'error'); });
      });
    });

    UI.on(host, '[data-act="toggle"]', 'change', function (e, input) {
      var id = input.closest('tr').getAttribute('data-id');
      var rec = Store.finishCode(id);
      Api.finishCodes.setEnabled(id, input.checked)
        .then(function () { return Store.refresh(); })
        .then(function () {
          UI.toast('"' + rec.name + '" ' + (input.checked ? 'enabled.' : 'disabled.'));
        })
        .catch(function (err) { UI.toast(err.message, 'error'); renderBody(); });
    });

    unsub = Store.subscribe(function () { if (host) renderBody(); });
  }

  function unmount() {
    if (unsub) { unsub(); unsub = null; }
    host = null;
  }

  function setSearch(term) {
    search = term || '';
    if (host) renderBody();
  }

  return { mount: mount, unmount: unmount, setSearch: setSearch };
})();
