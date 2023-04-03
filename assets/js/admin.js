/* global Set */
/**
 * Admin default page (OAuth Client list)
 *
 * Note: the globals we specify to the linter are because the assets directory
 * is primarily for the OCHA userbase which includes IE11, so the ecmaVersion
 * has been set to 5. However, this particular file is for HID Admins and we
 * are most definitely not using IE11, hence the more modern JS. The ecmaVersion
 * can't be specified per-file so I defined the ES6 globals we're using instead.
 */
(function iife() {
  const searchInput = document.querySelector('#client-search');
  const searchClear = document.querySelector('#client-search-clear');
  const searchSummary = document.querySelector('#client-search-summary');
  const clients = document.querySelectorAll('.oac-admin__client');

  // Take input and filter list.
  searchInput.addEventListener('keyup', () => {
    // Set up our search term in lowercase
    let search = searchInput.value.toLowerCase();

    if (search) {
      // Convert NodeList to Array.
      const clientArray = [...clients];

      // Filter arrays by processing the data-search attribute convert to lower,
      // and match each space-separated string.
      //
      // Ex: `ocha dev` should match all entries that have "ocha" and "dev", but
      //     it doesn't have to be exact — `ocha not dev` will also match.
      const isMatching = clientArray.filter((client) => search.split(' ').every((term) => client.getAttribute('data-search').toLowerCase().indexOf(term) !== -1));

      // Now diff the array and assume anything else failed to match.
      const matchSubset = new Set(isMatching);
      const notMatching = [...new Set(clientArray.filter((x) => !matchSubset.has(x)))];

      // Remove/add classes as needed.
      isMatching.forEach((client) => client.classList.remove('client--hidden'));
      notMatching.forEach((client) => client.classList.add('client--hidden'));

      // Count results and display
      const numResults = isMatching.length;
      searchSummary.innerHTML = `, and you filtered down to <strong>${numResults} client${numResults === 1 ? '' : 's'}</strong>`;
    } else {
      // Show all clients
      clients.forEach((client) => client.classList.remove('client--hidden'));
      searchSummary.innerHTML = '';
    }
  });

  // Wire up the Clear button.
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    clients.forEach((client) => client.classList.remove('client--hidden'));
    searchSummary.innerHTML = '';
  });
}());
