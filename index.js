var Hexy = require('./lib/hexy');
var TARGET = '/dev/tty.usbmodem1421';
var hexy;

hexy = new Hexy(TARGET, function () {});

