/* =========================================================================
   Shell bootstrap: icons, tab routing, global search.
   ========================================================================= */
(function () {

  var VIEWS = { finish: FinishListView, variables: VariablesView };
  var current = null;
  var currentKey = null;
  var viewHost = document.getElementById('viewHost');
  var tabsEl = document.getElementById('tabs');

  function show(key) {
    if (currentKey === key) return;
    if (current) current.unmount();

    // fresh container per mount -> delegated listeners never stack up
    viewHost.innerHTML = '';
    var container = document.createElement('div');
    viewHost.appendChild(container);

    current = VIEWS[key];
    currentKey = key;
    current.mount(container);

    var tabs = tabsEl.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('is-active', tabs[i].getAttribute('data-tab') === key);
    }
    if (window.location.hash !== '#' + key) {
      window.history.replaceState(null, '', '#' + key);
    }
  }

  tabsEl.addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (tab) show(tab.getAttribute('data-tab'));
  });

  window.addEventListener('hashchange', function () {
    var key = window.location.hash.replace('#', '');
    if (VIEWS[key]) show(key);
  });

  var globalSearch = document.getElementById('globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('input', function (e) {
      FinishListView.setSearch(e.target.value);
      if (e.target.value && currentKey !== 'finish') show('finish');
    });
  }

  Icons.hydrate(document);

  Store.refresh().then(function () {
    var key = window.location.hash.replace('#', '');
    show(VIEWS[key] ? key : 'finish');
  }).catch(function (err) {
    viewHost.innerHTML = '<div class="page"><div class="card"><div class="empty">' +
      'The data could not be loaded: ' + UI.esc(err.message) + '</div></div></div>';
  });

})();
