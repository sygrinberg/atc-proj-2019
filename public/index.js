$(document).ready(function() {
  var $typeInput = $('#category');
  var $victimEmail = $('#victimEmail');
  var $submitBtn = $('.submit-btn');
  var $meetupContent = $('.meetup-result');
  $typeInput.on('change', function() {
    if ($typeInput.val()) {
      $submitBtn.prop('disabled', false);
    } else {
      $submitBtn.prop('disabled', true);
    }
  });
  $submitBtn.on('click', function() {
    $.post({
      url: '/process',
      dataType: 'JSON',
      data: {
        topic: $typeInput.val(),
        email: $victimEmail.val()
      },
      success: function(data) {
        console.log(data);
        $meetupContent.html(JSON.stringify(data));
        $meetupContent.html(data.map(function(str) {
          return $('<div>', {
            html: JSON.stringify(str)
          });
        }));

      },
      error: function() {
        console.log('EERRRRORRRRR');
        $typeInput.val('').trigger('change');
      },
    });
    $typeInput.val('').trigger('change');
  });
});