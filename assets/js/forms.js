//
// Password strength
//
// The password strength is ultimately enforced in the HID API, but we can
// double check here and prompt the user to submit a strong password beforehand.
//
function checkPassword(password) {
  var passwordStrength = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()+=\\`{}]).+$/;
  return password.length >= 12 && passwordStrength.test(password);
}

//
// Form validation
//
function checkForm(form) {
  // Do the passwords match?
  if (form.password.value === form.confirm_password.value) {
    // Is the password strong enough?
    if (checkPassword(form.password.value)) {
      // Submit form.
      return true;
    } else {
      // Password needs to be stronger.
      alert("The password you have entered is not strong enough! Make sure it has at least 12 characters with one number, one lowercase, one uppercase, and one special character.");
      form.password.focus();

      return false;
    }
  } else {
    // Passwords didn't match.
    alert("The passwords do not match. Please confirm your password by entering it again.");
    form.confirm_password.value = '';
    form.confirm_password.focus();

    return false;
  }

  // If we fall through all conditions, return false and allow the HTML5 form
  // validation to kick in.
  return false;
}
