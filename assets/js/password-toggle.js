(function iife() {
  /**
   * Find the password inputs and toggle buttons
   */
  var passwordInputs = document.querySelectorAll('input[type="password"]');
  var passwordToggles = document.querySelectorAll('.password__viz-toggle');

  /**
   * Toggle password visibility
   *
   * Wire them all up so that clicking any toggle will affect all password
   * inputs simultaneously.
   */
  passwordToggles.forEach(function listenForToggles(thisToggle) {
    // Assign the same listener to every toggle button.
    thisToggle.addEventListener('click', function listenToThisToggle() {
      // Look at the FIRST password input and use this as our reference. In case
      // something weird happens and they get out of sync, using one field to
      // read our state will sync them back up.
      var currentType = passwordInputs[0].type;

      // Now loop through and set them all based on the reference field.
      passwordInputs.forEach(function toggleThisField(thisPasswordField) {
        thisPasswordField.type = currentType === 'password' // eslint-disable-line no-param-reassign
          ? 'text'
          : 'password';
      });

      // Toggle the toggle buttons themselves.
      passwordToggles.forEach(function toggleThisToggler(thisToggler) {
        if (currentType === 'password') {
          thisToggler.classList.add('viz-toggle--hide');
        } else {
          thisToggler.classList.remove('viz-toggle--hide');
        }
      });
    });
  });
}());
