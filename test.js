var Hexy = require('./lib/hexy');
var temporal = require('temporal');
var TARGET = '/dev/tty.usbmodem1421';
var hexy;

hexy = new Hexy(TARGET, function () {
   temporal.queue([
    {
      delay: 0,
      task: function () {
        hexy.setZero()
      }
    }, {
      delay: 2000,
      task: function () {
        hexy.getUp();
      }
    }
  ]);

});

