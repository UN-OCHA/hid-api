/**
 * Settings
 *
 * Dependencies:
 * - confirmation.js
 */
(function iife () {
  var form = document.querySelector('.form--settings-oauth-clients');
  var formActions = form.querySelectorAll('button');
  var formAction = null;
  var clientToRevoke = null;

  // Validate form submissions.
  form.addEventListener('submit', function (ev) {
    // The form allows most submissions by default.
    // However if the user is revoking an OAuth Client, confirm it first.
    if (formAction !== 'oauth_client_revoke' || confirmRemoval(clientToRevoke)) {
      // Allow the submission.
    } else {
      // Prevent the submission.
      ev.preventDefault();
    }
  });

  // When triggering the delete buttons, set up the submit handler to require
  // confirmation of the deletion.
  formActions.forEach(function (btn) {
    btn.addEventListener('click', function (ev) {
      formAction = btn.name;
      clientToRevoke = btn.dataset.clientName;
    });
  });
}());
