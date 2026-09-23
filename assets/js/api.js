/* =========================================================================
   API LAYER (simulated)
   -------------------------------------------------------------------------
   Every screen talks to the backend ONLY through this object, and every
   method returns a Promise — so replacing the mock body with a real `fetch`
   is a drop-in change. Suggested real endpoints are noted per method.
   ========================================================================= */
var Api = (function () {

  var LATENCY = 160;                       // ms, to make the async edges visible
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function ok(value) {
    return new Promise(function (res) { setTimeout(function () { res(clone(value)); }, LATENCY); });
  }
  function fail(message, code) {
    return new Promise(function (_, rej) {
      setTimeout(function () {
        var e = new Error(message); e.code = code || 'ERROR'; rej(e);
      }, LATENCY);
    });
  }
  function norm(s) { return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

  /* ------------------------------------------------------------------ */
  /* Variables catalog                                                   */
  /* ------------------------------------------------------------------ */
  var variables = {

    /* GET /api/finish-uc-code/variable-sections */
    sections: function () { return ok(MockDb.sections); },

    /* GET /api/finish-uc-code/variables */
    list: function () { return ok(MockDb.variables); },

    /* POST /api/finish-uc-code/variables  { section, name } */
    create: function (section, name) {
      name = String(name || '').trim();
      if (!name) return fail('The variable name is required.', 'REQUIRED');
      var dup = MockDb.variables.some(function (v) {
        return v.section === section && norm(v.name) === norm(name);
      });
      if (dup) return fail('"' + name + '" already exists in this section.', 'DUPLICATE');

      var row = { id: MockDb.nextId(section), section: section, name: name, status: 'active' };
      MockDb.variables.push(row);
      return ok(row);
    },

    /* PATCH /api/finish-uc-code/variables/:id  { name }  (rename / replace) */
    rename: function (id, name) {
      name = String(name || '').trim();
      if (!name) return fail('The variable name is required.', 'REQUIRED');
      var row = find(id);
      if (!row) return fail('Variable not found.', 'NOT_FOUND');
      var dup = MockDb.variables.some(function (v) {
        return v.id !== id && v.section === row.section && norm(v.name) === norm(name);
      });
      if (dup) return fail('"' + name + '" already exists in this section.', 'DUPLICATE');

      row.name = name;                       // records point at the id -> propagates
      return ok(row);
    },

    /* PATCH /api/finish-uc-code/variables/:id  { status: active|disabled } */
    setStatus: function (id, status) {
      var row = find(id);
      if (!row) return fail('Variable not found.', 'NOT_FOUND');
      row.status = status === 'disabled' ? 'disabled' : 'active';
      return ok(row);
    },

    /* GET /api/finish-uc-code/variables/:id/usage
       -> the records that would be affected by a delete */
    usage: function (id) {
      var row = find(id);
      if (!row) return ok([]);
      var field = fieldOf(row.section);
      return ok(MockDb.finishCodes.filter(function (r) { return r[field] === id; })
        .map(function (r) { return { id: r.id, name: r.name, consecutive: r.consecutive }; }));
    },

    /* DELETE /api/finish-uc-code/variables/:id
       Hard delete. Records keep existing; only the referencing field is
       cleared (left blank), exactly as warned in the confirmation modal. */
    remove: function (id) {
      var row = find(id);
      if (!row) return fail('Variable not found.', 'NOT_FOUND');
      var field = fieldOf(row.section);
      var cleared = 0;
      MockDb.finishCodes.forEach(function (r) {
        if (r[field] === id) { r[field] = null; cleared += 1; }
      });
      MockDb.variables = MockDb.variables.filter(function (v) { return v.id !== id; });
      return ok({ id: id, name: row.name, section: row.section, clearedRecords: cleared });
    }
  };

  function find(id) {
    for (var i = 0; i < MockDb.variables.length; i++) {
      if (MockDb.variables[i].id === id) return MockDb.variables[i];
    }
    return null;
  }
  function fieldOf(sectionKey) {
    for (var i = 0; i < MockDb.sections.length; i++) {
      if (MockDb.sections[i].key === sectionKey) return MockDb.sections[i].field;
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Finish & UC Code records                                            */
  /* ------------------------------------------------------------------ */
  var finishCodes = {

    /* GET /api/finish-uc-code */
    list: function () { return ok(MockDb.finishCodes); },

    /* POST /api/finish-uc-code */
    create: function (dto) {
      if (!String(dto.name || '').trim()) return fail('Name is required.', 'REQUIRED');
      var row = {
        id: MockDb.nextId('fc'),
        name: String(dto.name).trim(),
        consecutive: String(dto.consecutive || '').trim(),
        supplierId: dto.supplierId || null,
        aamaId: dto.aamaId || null,
        coveringId: dto.coveringId || null,
        description: String(dto.description || '').trim(),
        enabled: dto.enabled !== false
      };
      MockDb.finishCodes.unshift(row);
      return ok(row);
    },

    /* PUT /api/finish-uc-code/:id */
    update: function (id, dto) {
      var row = null;
      MockDb.finishCodes.forEach(function (r) { if (r.id === id) row = r; });
      if (!row) return fail('Record not found.', 'NOT_FOUND');
      if (!String(dto.name || '').trim()) return fail('Name is required.', 'REQUIRED');
      row.name        = String(dto.name).trim();
      row.consecutive = String(dto.consecutive || '').trim();
      row.supplierId  = dto.supplierId || null;
      row.aamaId      = dto.aamaId || null;
      row.coveringId  = dto.coveringId || null;
      row.description = String(dto.description || '').trim();
      return ok(row);
    },

    /* PATCH /api/finish-uc-code/:id { enabled } */
    setEnabled: function (id, enabled) {
      var row = null;
      MockDb.finishCodes.forEach(function (r) { if (r.id === id) row = r; });
      if (!row) return fail('Record not found.', 'NOT_FOUND');
      row.enabled = !!enabled;
      return ok(row);
    },

    /* DELETE /api/finish-uc-code/:id */
    remove: function (id) {
      var before = MockDb.finishCodes.length;
      MockDb.finishCodes = MockDb.finishCodes.filter(function (r) { return r.id !== id; });
      if (MockDb.finishCodes.length === before) return fail('Record not found.', 'NOT_FOUND');
      return ok({ id: id });
    },

    /* GET /api/finish-uc-code/next-consecutive?coveringId=...
       Provisional rule (see MockDb): prefix by technology + running number. */
    nextConsecutive: function (coveringId) {
      var prefix = MockDb.consecutiveFallback;
      MockDb.variables.forEach(function (v) {
        if (v.id === coveringId && MockDb.consecutivePrefix[v.name]) {
          prefix = MockDb.consecutivePrefix[v.name];
        }
      });
      var max = 0;
      MockDb.finishCodes.forEach(function (r) {
        var m = /^([A-Za-z]+)(\d+)$/.exec(r.consecutive || '');
        if (m && m[1].toUpperCase() === prefix) max = Math.max(max, parseInt(m[2], 10));
      });
      var n = String(max + 1);
      while (n.length < 3) n = '0' + n;
      return ok(prefix + n);
    },

    /* POST /api/finish-uc-code/import  (CSV rows already parsed) */
    importRows: function (rows) {
      var added = 0, unmatched = 0;
      rows.forEach(function (r) {
        if (!r.name) return;
        var sup = matchVar('supplier', r.supplier);
        var aam = matchVar('aama', r.aama);
        var cov = matchVar('covering', r.covering);
        if ((r.supplier && !sup) || (r.aama && !aam) || (r.covering && !cov)) unmatched += 1;
        MockDb.finishCodes.unshift({
          id: MockDb.nextId('fc'),
          name: r.name,
          consecutive: r.consecutive || '',
          supplierId: sup ? sup.id : null,
          aamaId: aam ? aam.id : null,
          coveringId: cov ? cov.id : null,
          description: r.description || '',
          enabled: true
        });
        added += 1;
      });
      return ok({ added: added, unmatched: unmatched });
    }
  };

  function matchVar(section, name) {
    if (!name) return null;
    for (var i = 0; i < MockDb.variables.length; i++) {
      var v = MockDb.variables[i];
      if (v.section === section && norm(v.name) === norm(name)) return v;
    }
    return null;
  }

  return { variables: variables, finishCodes: finishCodes };
})();
