/**
 * Admin default page (OAuth Client list)
 */
(function iife() {
  const searchInput = document.querySelector('#client-search');
  const searchClear = document.querySelector('#client-search-clear');
  const searchSummary = document.querySelector('#client-search-summary');
  const clients = document.querySelectorAll('.oac-admin__client');

  // Take input and filter list.
  searchInput.addEventListener('keyup', ev => {
    // Set up our search term in lowercase
    search = searchInput.value.toLowerCase();

    if (search) {
      // Convert NodeList to Array.
      const clientArray = [...clients];

      // Filter arrays by processing the data-search attribute convert to lower,
      // and match each space-separated string.
      //
      // Ex: `ocha dev` should match all entries that have "ocha" and "dev", but
      //     it doesn't have to be exact — "ocha not dev" will also match.
      const isMatching = clientArray.filter(client => search.split(' ').every(term => client.getAttribute('data-search').toLowerCase().indexOf(term) !== -1));

      // Now diff the array and assume anything else failed to match.
      const matchSubset = new Set(isMatching);
      const notMatching = [...new Set(clientArray.filter(x => !matchSubset.has(x)))];

      // Remove/add classes as needed.
      isMatching.forEach(client => client.classList.remove('client--hidden'));
      notMatching.forEach(client => client.classList.add('client--hidden'));

      // Count results and display
      const numResults = isMatching.length;
      searchSummary.innerHTML = `, and you filtered down to <strong>${numResults} client${numResults === 1 ? '' : 's' }</strong>`;
    } else {
      // Show all clients
      clients.forEach(client => client.classList.remove('client--hidden'));
      searchSummary.innerHTML = '';
    }
  });

  // Wire up the Clear button.
  searchClear.addEventListener('click', ev => {
    searchInput.value = '';
    clients.forEach(client => client.classList.remove('client--hidden'));
    searchSummary.innerHTML = '';
  });
})();
