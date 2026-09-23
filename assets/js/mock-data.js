/* =========================================================================
   MOCK DATABASE
   -------------------------------------------------------------------------
   This is the only place where fake persistence lives. When the real backend
   is available, delete this file and point assets/js/api.js at the endpoints
   (the shapes below are the contract the UI expects).

   Key idea: a Finish & UC Code record NEVER stores the text of a variable,
   it stores the variable **id**. That is what makes:
     - rename   -> propagates everywhere automatically
     - disable  -> hidden for new records, kept on historical ones
     - delete   -> the field is set to null (left blank), record is preserved
   ========================================================================= */
var MockDb = (function () {

  /* ---- the sections rendered by the VARIABLES view -------------------- */
  var sections = [
    { key: 'supplier', label: 'Supplier', field: 'supplierId', icon: 'truck',  column: 'SUPPLIER' },
    { key: 'aama',     label: 'AAMA',     field: 'aamaId',     icon: 'shield', column: 'AAMA' },
    { key: 'covering', label: 'Covering', field: 'coveringId', icon: 'spray',  column: 'COVERING' }
  ];

  /* ---- variables (the catalog that feeds the form) -------------------- */
  var variables = [
    { id: 'sup-1',  section: 'supplier', name: 'PPG',      status: 'active' },
    { id: 'sup-2',  section: 'supplier', name: 'Recya',    status: 'active' },
    { id: 'sup-3',  section: 'supplier', name: 'Decoral',  status: 'active' },

    { id: 'aama-1', section: 'aama',     name: '2604',     status: 'active' },
    { id: 'aama-2', section: 'aama',     name: '2605',     status: 'active' },
    { id: 'aama-3', section: 'aama',     name: '2603',     status: 'active' },

    { id: 'cov-1',  section: 'covering', name: 'Liquido',  status: 'active' },
    { id: 'cov-2',  section: 'covering', name: 'Polvo',    status: 'active' },
    { id: 'cov-3',  section: 'covering', name: 'Pelicula', status: 'active' }
  ];

  /* ---- finish & uc code records --------------------------------------- */
  var finishCodes = [
    { id: 'fc-01', name: 'PCNT75224P',    consecutive: 'PV057', supplierId: 'sup-1', aamaId: null,     coveringId: 'cov-2', description: 'SILVER CHALLICE TEX OB FLUOROPOLYMER', enabled: true },
    { id: 'fc-02', name: 'PCNT79344P',    consecutive: 'CF002', supplierId: 'sup-1', aamaId: 'aama-2', coveringId: 'cov-2', description: 'AAMA 2605 CORAFLON TELEGRAY',          enabled: true },
    { id: 'fc-03', name: 'RAL 1018 MATE', consecutive: 'PV075', supplierId: null,    aamaId: null,     coveringId: null,    description: 'Alesta Poliester Arq Amarillo RAL 1018 MATE', enabled: true },
    { id: 'fc-04', name: 'RAL 6007 MATE', consecutive: 'PV076', supplierId: null,    aamaId: null,     coveringId: null,    description: 'Alesta Poliester Arq Verde RAL 6007 MATE',    enabled: true },
    { id: 'fc-05', name: 'RAL 6018 MATE', consecutive: 'PV077', supplierId: null,    aamaId: null,     coveringId: null,    description: 'Alesta Poliester Arq Verde RAL 6018 MATE',    enabled: true },
    { id: 'fc-06', name: '143460',        consecutive: 'DR219', supplierId: 'sup-3', aamaId: null,     coveringId: 'cov-1', description: 'Arcadia Silver',            enabled: true },
    { id: 'fc-07', name: '11150173',      consecutive: 'DR220', supplierId: 'sup-3', aamaId: 'aama-1', coveringId: 'cov-1', description: 'Azul Mar liso B Poliester', enabled: true },
    { id: 'fc-08', name: '10150020',      consecutive: 'PV078', supplierId: 'sup-2', aamaId: 'aama-3', coveringId: 'cov-2', description: 'Azul Ral 5002 liso sb Poliester', enabled: true },
    { id: 'fc-09', name: '40585',         consecutive: 'DR221', supplierId: 'sup-2', aamaId: null,     coveringId: 'cov-3', description: 'Black',                     enabled: true },
    { id: 'fc-10', name: 'PCNT81120P',    consecutive: 'PL004', supplierId: 'sup-3', aamaId: 'aama-2', coveringId: 'cov-3', description: 'Decoral Wood Golden Oak',   enabled: true },
    { id: 'fc-11', name: 'RAL 9006 SB',   consecutive: 'LQ012', supplierId: 'sup-2', aamaId: 'aama-1', coveringId: 'cov-1', description: 'Recya Aluminio Liquido RAL 9006', enabled: false }
  ];

  /* ---- provisional consecutive rule -----------------------------------
     The PDF note says: "El campo consecutivo es un campo automatico (aun no
     cuenta con una logica definida...) pero basicamente depende la tecnologia
     que el usuario ingrese."  -> we derive the prefix from Covering and keep
     a running number. Swap this single map once the real rule is defined.  */
  var consecutivePrefix = {
    'Polvo':    'PV',
    'Liquido':  'LQ',
    'Pelicula': 'PL'
  };
  var consecutiveFallback = 'GN';

  var seq = 100;
  function nextId(p) { seq += 1; return p + '-' + seq; }

  return {
    sections: sections,
    variables: variables,
    finishCodes: finishCodes,
    consecutivePrefix: consecutivePrefix,
    consecutiveFallback: consecutiveFallback,
    nextId: nextId
  };
})();
