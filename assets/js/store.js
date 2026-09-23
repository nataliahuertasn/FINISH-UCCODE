/* =========================================================================
   STORE
   -------------------------------------------------------------------------
   Single in-memory projection of what the API returned + the selectors the
   views need. Views never read MockDb directly: they read the store and call
   Api.*, then Store.refresh() re-publishes and every subscriber re-renders.
   ========================================================================= */
var Store = (function () {

  var state = { sections: [], variables: [], finishCodes: [], ready: false };
  var subs = [];

  function subscribe(fn) {
    subs.push(fn);
    return function () { subs = subs.filter(function (f) { return f !== fn; }); };
  }
  function emit() { subs.forEach(function (fn) { fn(state); }); }

  function refresh() {
    return Promise.all([
      Api.variables.sections(),
      Api.variables.list(),
      Api.finishCodes.list()
    ]).then(function (res) {
      state.sections    = res[0];
      state.variables   = res[1];
      state.finishCodes = res[2];
      state.ready       = true;
      emit();
      return state;
    });
  }

  /* ---------------- selectors ---------------- */

  function sections() { return state.sections; }

  function section(key) {
    for (var i = 0; i < state.sections.length; i++) {
      if (state.sections[i].key === key) return state.sections[i];
    }
    return null;
  }

  function sectionOfField(field) {
    for (var i = 0; i < state.sections.length; i++) {
      if (state.sections[i].field === field) return state.sections[i];
    }
    return null;
  }

  function variablesOf(key) {
    return state.variables.filter(function (v) { return v.section === key; });
  }

  /* only these show up for NEW records */
  function activeOf(key) {
    return variablesOf(key).filter(function (v) { return v.status === 'active'; });
  }

  function variable(id) {
    if (!id) return null;
    for (var i = 0; i < state.variables.length; i++) {
      if (state.variables[i].id === id) return state.variables[i];
    }
    return null;   // deleted variable -> the record field reads as blank
  }

  function nameOf(id) { var v = variable(id); return v ? v.name : ''; }
  function isDisabled(id) { var v = variable(id); return !!v && v.status === 'disabled'; }

  /* Options for a <select>:
     active variables, plus the value the record already holds even if that
     value was disabled afterwards (historical data must stay selectable). */
  function optionsFor(sectionKey, currentId) {
    var opts = activeOf(sectionKey).map(function (v) {
      return { id: v.id, name: v.name, disabled: false };
    });
    var cur = variable(currentId);
    if (cur && cur.status === 'disabled') {
      opts.push({ id: cur.id, name: cur.name, disabled: true });
    }
    return opts;
  }

  /* how many records currently reference this variable */
  function usage(id) {
    var v = variable(id);
    if (!v) return [];
    var sec = section(v.section);
    if (!sec) return [];
    return state.finishCodes.filter(function (r) { return r[sec.field] === id; });
  }
  function usageCount(id) { return usage(id).length; }

  function finishCodes() { return state.finishCodes; }

  function finishCode(id) {
    for (var i = 0; i < state.finishCodes.length; i++) {
      if (state.finishCodes[i].id === id) return state.finishCodes[i];
    }
    return null;
  }

  return {
    state: state,
    subscribe: subscribe,
    refresh: refresh,
    sections: sections,
    section: section,
    sectionOfField: sectionOfField,
    variablesOf: variablesOf,
    activeOf: activeOf,
    variable: variable,
    nameOf: nameOf,
    isDisabled: isDisabled,
    optionsFor: optionsFor,
    usage: usage,
    usageCount: usageCount,
    finishCodes: finishCodes,
    finishCode: finishCode
  };
})();
