/* global confirmRemoval */

/**
 * Profile Edit
 *
 * Dependencies:
 * - confirmation.js
 */
(function iife() {
  var form = document.querySelector('.form--profile-emails');
  var formActions = form.querySelectorAll('button');
  var formAction = null;
  var emailToDelete = null;

  // Validate form submissions.
  form.addEventListener('submit', function settingsSubmitHandler(ev) {
    // The form allows most submissions by default.
    // However if the user is removing an email, confirm it first.
    if (formAction !== 'email_delete' || confirmRemoval(emailToDelete)) {
      // Allow the submission.
    } else {
      // Prevent the submission.
      ev.preventDefault();
    }
  });

  // When triggering the delete buttons, set up the submit handler to require
  // confirmation of the deletion.
  formActions.forEach(function settingsAssignButtonHandler(btn) {
    btn.addEventListener('click', function settingsButtonHandler() {
      formAction = btn.name;
      emailToDelete = btn.value;
    });
  });
}());
