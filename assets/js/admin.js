/**
 * Admin default page (OAuth Client list)
 */
(function iife() {
  const searchInput = document.querySelector('#client-search');
  const searchClear = document.querySelector('#client-search-clear');
  const clients = document.querySelectorAll('.oac-admin__client');

  // Take input and filter list.
  searchInput.addEventListener('keyup', ev => {
    // Set up our search term in lowercase
    search = searchInput.value.toLowerCase();

    if (search) {
      // Filter arrays by processing the data-search attribute and doing really
      // naive matching: lowercase, and look for one instance of string
      const isMatching = [...clients].filter(client => client.getAttribute('data-search').toLowerCase().indexOf(search) !== -1);
      const notMatching = [...clients].filter(client => client.getAttribute('data-search').toLowerCase().indexOf(search) === -1);

      // Remove/add classes as needed.
      isMatching.forEach(client => client.classList.remove('client--hidden'));
      notMatching.forEach(client => client.classList.add('client--hidden'));
    } else {
      // Show all clients
      clients.forEach(client => client.classList.remove('client--hidden'));
    }
  });

  // Clear the filter.
  searchClear.addEventListener('click', ev => {
    ev.preventDefault();
    ev.stopPropagation();

    // Unset all hidden classes
    clients.forEach(client => client.classList.remove('client--hidden'));

    // Unset search input
    searchInput.value = '';
  })
})();
