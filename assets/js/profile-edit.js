/**
 * Profile Edit
 *
 * Dependencies:
 * - confirmation.js
 */
(function iife () {
  var formEmails = document.querySelector('.form--profile-emails');

  // Require a confirmation before deleting an email from the profile.
  formEmails.addEventListener('submit', function (ev) {
    var formAction = ev.submitter.name;
    var emailToDelete = ev.submitter.value;

    // If the user is removing an email, confirm it first.
    // Otherwise allow the form to submit like normal.
    if (formAction !== 'email_delete' || confirmRemoval(emailToDelete)) {
      // Allow the submission
    } else {
      ev.preventDefault();
    }
  });
}());
