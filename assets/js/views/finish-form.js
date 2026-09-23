/* =========================================================================
   NEW / EDIT "Finish AND UC Code" modal.
   -------------------------------------------------------------------------
   Layout follows the PDF: Name*, Supplier, AAMA, Covering, Description,
   Consecutive*, SAVE.

   Per the PDF notes ("Observaciones"):
     - Name        -> free text
     - Description -> free text
     - Supplier / AAMA / Covering -> DROPDOWNS fed by the Variables section.
       The <option> list is built from the store at open time; nothing is
       hard-coded here.
     - Consecutive -> automatic, derived from the technology (Covering).
       The final rule is still to be defined, so it is generated and shown
       read-only, with a manual override.
   ========================================================================= */
var FinishForm = (function () {

  function fieldSelect(sec, currentId) {
    var opts = Store.optionsFor(sec.key, currentId);
    var html = '<option value="">&mdash;</option>';
    opts.forEach(function (o) {
      html += '<option value="' + UI.esc(o.id) + '"' +
        (o.id === currentId ? ' selected' : '') +
        (o.disabled ? ' class="opt-disabled"' : '') + '>' +
        UI.esc(o.name) + (o.disabled ? '  (disabled)' : '') +
        '</option>';
    });

    var note = '';
    if (!Store.activeOf(sec.key).length) {
      note = '<div class="field-note">No values available. Add them in <b>Variables</b>.</div>';
    }

    return '' +
      '<div class="field" data-field="' + sec.field + '">' +
        '<div class="field-ico">' + Icons.svg(sec.icon) + '</div>' +
        '<div class="field-main">' +
          '<label class="field-label" for="f_' + sec.key + '">' + UI.esc(sec.label) + '</label>' +
          '<select id="f_' + sec.key + '" data-input="' + sec.field + '">' + html + '</select>' +
          note +
        '</div>' +
      '</div>';
  }

  function open(record) {
    var isEdit = !!record;
    var data = record || {
      name: '', consecutive: '', supplierId: null, aamaId: null,
      coveringId: null, description: '', enabled: true
    };
    var autoConsecutive = !isEdit;      // new records auto-generate, edits keep theirs

    var sectionFields = Store.sections().map(function (sec) {
      return fieldSelect(sec, data[sec.field]);
    }).join('');

    var body =
      '<div class="field" data-field="name">' +
        '<div class="field-ico">' + Icons.svg('tag') + '</div>' +
        '<div class="field-main">' +
          '<label class="field-label" for="f_name">Name<span class="req">*</span></label>' +
          '<input id="f_name" type="text" data-input="name" value="' + UI.esc(data.name) + '" autocomplete="off">' +
          '<div class="field-err" hidden></div>' +
        '</div>' +
      '</div>' +

      sectionFields +

      '<div class="field" data-field="description">' +
        '<div class="field-ico">' + Icons.svg('notes') + '</div>' +
        '<div class="field-main">' +
          '<label class="field-label" for="f_desc">Description</label>' +
          '<textarea id="f_desc" data-input="description">' + UI.esc(data.description) + '</textarea>' +
        '</div>' +
      '</div>' +

      '<div class="field" data-field="consecutive">' +
        '<div class="field-ico"><span class="num">123</span></div>' +
        '<div class="field-main">' +
          '<label class="field-label" for="f_cons">Consecutive<span class="req">*</span></label>' +
          '<input id="f_cons" type="text" data-input="consecutive" value="' + UI.esc(data.consecutive) + '"' +
            (autoConsecutive ? ' readonly' : '') + ' autocomplete="off">' +
          '<div class="field-note">' +
            '<span data-cons-note>' +
              (autoConsecutive ? 'Generated automatically. ' : 'Manual value. ') +
            '</span>' +
            '<a href="#" data-toggle-cons>' + (autoConsecutive ? 'Enter manually' : 'Use automatic') + '</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    UI.modal({
      title: 'Finish AND UC Code',
      body: body,
      footer: '<button class="btn btn-primary" type="button" data-act="save" disabled>SAVE</button>',
      onMount: function (root, close) {
        var nameEl = root.querySelector('[data-input="name"]');
        var consEl = root.querySelector('[data-input="consecutive"]');
        var covEl  = root.querySelector('[data-input="coveringId"]');
        var saveEl = root.querySelector('[data-act="save"]');
        var noteEl = root.querySelector('[data-cons-note]');
        var toggle = root.querySelector('[data-toggle-cons]');

        function refreshConsecutive() {
          if (!autoConsecutive) return;
          Api.finishCodes.nextConsecutive(covEl ? covEl.value : null).then(function (v) {
            if (autoConsecutive) consEl.value = v;
            validate();
          });
        }

        function validate() {
          var okName = !!nameEl.value.trim();
          var okCons = !!consEl.value.trim();
          saveEl.disabled = !(okName && okCons);
        }

        nameEl.addEventListener('input', validate);
        consEl.addEventListener('input', validate);
        if (covEl) covEl.addEventListener('change', refreshConsecutive);

        toggle.addEventListener('click', function (e) {
          e.preventDefault();
          autoConsecutive = !autoConsecutive;
          consEl.readOnly = autoConsecutive;
          toggle.textContent = autoConsecutive ? 'Enter manually' : 'Use automatic';
          noteEl.textContent = autoConsecutive ? 'Generated automatically. ' : 'Manual value. ';
          if (autoConsecutive) refreshConsecutive(); else consEl.focus();
          validate();
        });

        saveEl.addEventListener('click', function () {
          var dto = {
            name: nameEl.value,
            consecutive: consEl.value,
            description: root.querySelector('[data-input="description"]').value,
            enabled: data.enabled
          };
          Store.sections().forEach(function (sec) {
            var el = root.querySelector('[data-input="' + sec.field + '"]');
            dto[sec.field] = el && el.value ? el.value : null;
          });

          saveEl.disabled = true;
          var call = isEdit
            ? Api.finishCodes.update(record.id, dto)
            : Api.finishCodes.create(dto);

          call.then(function (row) {
            close();
            return Store.refresh().then(function () {
              UI.toast('"' + row.name + '"' + (isEdit ? ' updated.' : ' created.'));
            });
          }).catch(function (err) {
            saveEl.disabled = false;
            UI.toast(err.message || 'The record could not be saved.', 'error');
          });
        });

        if (autoConsecutive) refreshConsecutive();
        validate();
      }
    });
  }

  return { open: open };
})();
