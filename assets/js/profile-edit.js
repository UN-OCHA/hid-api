/**
 * Profile Edit
 *
 * Dependencies:
 * - confirmation.js
 */
(function iife () {
  var formEmails = document.querySelector('.form--profile-emails');
  var formActions = document.querySelectorAll('button[name="email_delete"]');
  var formAction = null;
  var emailToDelete = null;

  // Require a confirmation before deleting an email from the profile.
  // Any other submission should drop through.
  formEmails.addEventListener('submit', function (ev) {
    // If the user is removing an email, confirm it first.
    // Otherwise allow the form to submit like normal.
    if (formAction !== 'email_delete' || confirmRemoval(emailToDelete)) {
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
      formAction = 'email_delete';
      emailToDelete = btn.value;
    });
  });
}());
