(function iife() {
  /**
   * Find the form in the DOM.
   */
  var newPasswordForm = document.querySelector('#resetPassword');

  /**
   * Password strength
   *
   * The password strength is ultimately enforced in the HID API, but we can
   * double check here and prompt the user to submit a strong password beforehand.
   */
  function checkPassword(password) {
    var passwordStrength = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()+=\\`{}]).+$/;
    return password.length >= 12 && passwordStrength.test(password);
  }

  /**
   * Attach validation event listener to form.
   *
   * When we detect a problem, we fire event.preventDefault(), which stops the
   * form from submitting. Otherwise it will submit and proceed normally.
   */
  newPasswordForm.addEventListener('submit', function checkForm(ev) {
    // Store form so we can work with it below.
    var form = ev.target;

    // Do the passwords match?
    if (form.password.value !== form.confirm_password.value) {
      alert('The passwords do not match. Please confirm your password by entering it again.');
      form.confirm_password.value = '';
      form.confirm_password.focus();

      // Prevent form submission.
      ev.preventDefault();
    }

    // Is the password strong enough?
    if (!checkPassword(form.password.value)) {
      alert('The password you have entered is not strong enough! Make sure it has at least 12 characters with one number, one lowercase, one uppercase, and one special character.');
      form.password.focus();

      // Prevent form submission.
      ev.preventDefault();
    }

    // If we fall through all conditions, allow the HTML5 validation to kick in.
  });
}());
