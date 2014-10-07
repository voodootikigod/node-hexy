var SerialPort = require('serialport').SerialPort;
var temporal = require('temporal');
var Servo = require('./servo');

var MAX_SERVOS = 32;
var FLOOR = 60;
var STEPPERS = 5;

function degrees (radians) {
  return radians * 180 / Math.PI;
};

function radians(degrees) {
  return degrees * Math.PI / 180;
};


module.exports = function (serialport_target, cb) {
	var that = this;
	that.connected = false;
	that.servos = [];
	that.hexapod = {
		neck: 31,
		legs: {
			right: {
				front:  {
					hip: 24,
					knee: 25,
					ankle: 26
				},
				middle: {
					hip: 20,
					knee: 21,
					ankle: 22
				},
				back: 	{
					hip: 16,
					knee: 17,
					ankle: 18
				}
			},
			left: {
				front: 	{
					hip: 7,
					knee: 6,
					ankle: 5
				},
				middle: {
					hip: 11,
					knee: 10,
					ankle: 9
				},
				back: 	{
					hip: 15,
					knee: 14,
					ankle: 13
				}
			}
		}
	};

	function setFootY(leg, footY) {
		if ((footY < 75) && (footY > -75)) {
	    kneeAngle = degrees(Math.asin( parseFloat(footY) /75.0 ));
	    ankleAngle = 90-kneeAngle
	    leg.knee.setPos(kneeAngle);
	    leg.ankle.setPos(ankleAngle);
		}
	}


	function replantFoot(leg, endHipAngle, stepTime, done) {
		var currentHipAngle = leg.hip.getPosDeg();
    var hipMaxDiff = endHipAngle - currentHipAngle;

		var delay = (stepTime/STEPPERS) * 1000;
		var actions = [];
    for (var idx =0; idx< STEPPERS; idx++) {
    	actions.push({
    		delay: delay,
    		task: (function (i) {
    			return function () {
						var hipAngle = (hipMaxDiff/STEPPERS)*(i+1);
			      // Calculate the absolute distance between the foot's highest and lowest point
			      var footMax = 0, footMin = FLOOR, footRange = Math.abs(footMax-footMin);
			      var anglNorm;
			      // Normalize the range of the hip movement to 180 deg
			      try {
			        anglNorm=hipAngle*(180/(hipMaxDiff));
			      } catch (e) {
			        anglNorm=hipAngle*(180/(1));
			      }

			      // Base footfall on a sin pattern from footfall to footfall with 0 as the midpoint
			      var footY = footMin-Math.sin(radians(anglNorm))*footRange;

			      setFootY(leg, footY);

			      var hipAngle = currentHipAngle + hipAngle;
			      leg.hip.setPos(hipAngle);
    			}
    		})(idx)
    	});
		}

		actions.push({
				delay: 500,
				task: function  () {
					if (done) {
						done();
					}
				}
			});


		temporal.queue(actions);

	}

	function mapHexapodServos(branch, done) {
		var len = Object.keys(branch).length,
				idx = 0;
		var end = function () {
			idx += 1;
			if (idx == len) {
				done();
			}
		};

		for (var i in branch) {
			if (typeof branch[i] == 'number') {
				branch[i] = that.servos[branch[i]];
				end();
			} else {
				mapHexapodServos(branch[i], end);
			}
		}
	}
	function initialize() {
		that.connected = true;

		console.log('Hexy Connected :)');
		//initialize servos; and reset them
		for (var i=0; i < MAX_SERVOS; i++) {
			that.servos[i] = new Servo(that.serialport, i);
			that.servos[i].kill();
		}
		mapHexapodServos(that.hexapod, function () {
			console.log("Mapped");
			if (cb) {
				cb();
			}
		});
	}

	that.serialport = new SerialPort(serialport_target, {
	  baudrate: 9600
	}, true, initialize);

	that.serialport.on('disconnect', function () {
		that.connected = false;
		console.log('Hexy Disconnected :(');
	})



	// Hexy Moves!!!!

	that.setZero = function ( done ) {
		for (var i=0; i < MAX_SERVOS; i++) {
			that.servos[i].setPos(0);
		}

		if (done) {
			done();
		}
	}


	that.bellyFlop = function (done) {
		temporal.queue([
			{
				delay: 0,
				task: function () {
					that.setZero()
				}
			},
			{
				delay: 2000,
				task: function () {
					that.getUp()
				}
			},
			{
				delay: 500,
				task: function  () {
					if (done) {
						done();
					}
				}
			}
		])
	}

	that.tiltLeft = function (done) {
		var actions = [{
			delay: 	0,
			task: 	function () {
				setFootY(that.hexapod.legs.left.front, 0);
				setFootY(that.hexapod.legs.left.middle, -10);
				setFootY(that.hexapod.legs.left.back, 0);

				setFootY(that.hexapod.legs.right.front, 75);
				setFootY(that.hexapod.legs.right.middle, 75);
				setFootY(that.hexapod.legs.right.back, 75);
			}
		}, {
			delay:200,
			task: function () {
				if (done) {
					done();
				}
			}
		}];
		var q = temporal.queue(actions);
	}


	that.tiltRight = function (done) {
		var actions = [{
			delay: 	0,
			task: 	function () {
				setFootY(that.hexapod.legs.left.front, 75);
				setFootY(that.hexapod.legs.left.middle, 75);
				setFootY(that.hexapod.legs.left.back, 75);

				setFootY(that.hexapod.legs.right.front, 0);
				setFootY(that.hexapod.legs.right.middle, -10);
				setFootY(that.hexapod.legs.right.back, 0);
			}
		}, {
			delay:200,
			task: function () {
				if (done) {
					done();
				}
			}
		}];
		var q = temporal.queue(actions);
	}

	that.reset = function (done) {
		var deg = -30;
		var actions = [{
			delay: 0,
			task: function () {
				replantFoot(that.hexapod.legs.left.front, -deg, 0.3);
				replantFoot(that.hexapod.legs.right.middle, 1, 0.3);
				replantFoot(that.hexapod.legs.left.back, deg, 0.3);
			}
		},{
			delay: 500,
			task: function () {
				replantFoot(that.hexapod.legs.right.front, deg, 0.3);
				replantFoot(that.hexapod.legs.left.middle, 1, 0.3);
				replantFoot(that.hexapod.legs.right.back, -deg, 0.3);
			}
		},{
			delay: 500,
			task: function () {
				that.hexapod.legs.left.front.hip.setPos(-deg);
				that.hexapod.legs.right.middle.hip.setPos(1);
				that.hexapod.legs.left.back.hip.setPos(deg);
				that.hexapod.legs.right.front.hip.setPos(deg);
				that.hexapod.legs.left.middle.hip.setPos(1);
				that.hexapod.legs.right.back.hip.setPos(1);
			}
		}, {
			delay:200,
			task: function () {
				if (done) {
					done();
				}
			}
		}];
		var q = temporal.queue(actions);

	};
	that.tiltNone = function (done) {
		var actions = [{
			delay: 	0,
			task: 	function () {
				setFootY(that.hexapod.legs.left.front, FLOOR);
				setFootY(that.hexapod.legs.left.middle, FLOOR);
				setFootY(that.hexapod.legs.left.back, FLOOR);

				setFootY(that.hexapod.legs.right.front, FLOOR);
				setFootY(that.hexapod.legs.right.middle, FLOOR);
				setFootY(that.hexapod.legs.right.back, FLOOR);
			}
		}, {
			delay:200,
			task: function () {
				if (done) {
					done();
				}
			}
		}];
		var q = temporal.queue(actions);
	}

	that.getUp = function (done) {
		var deg = -30;
		var actions = [
		  {
		    delay: 0,
		    task: function() {
					// put all the feet centered and on the floor.
		    	that.hexapod.legs.left.front.hip.setPos(-deg);
		    	that.hexapod.legs.right.middle.hip.setPos(1);
		    	that.hexapod.legs.left.back.hip.setPos(deg);

		    	that.hexapod.legs.right.front.hip.setPos(deg);
		    	that.hexapod.legs.left.middle.hip.setPos(1);
		    	that.hexapod.legs.right.back.hip.setPos(-deg);
		    }
		  },
		  // line 17
		  {
		    delay: 500,
		    task: function() {
		    	['front', 'middle', 'back'].forEach(function (part) {
		    		that.hexapod.legs.left[part].knee.setPos(-30);
		    		that.hexapod.legs.right[part].knee.setPos(-30);

		    		that.hexapod.legs.left[part].hip.kill();
		    		that.hexapod.legs.right[part].hip.kill();
		    	});
		    }
		  },
		  // line 23
		  {
		    delay: 500,
		    task: function() {
		    	['front', 'middle', 'back'].forEach(function (part) {
		    		that.hexapod.legs.left[part].ankle.setPos(-90);
		    		that.hexapod.legs.right[part].ankle.setPos(-90);
		    	});
		    }
		  }
		];
		// line 28
		[0,45,3].forEach(function(angle) {
			actions.push({
				delay: 100,
				task: function () {
					['front', 'middle', 'back'].forEach(function (part) {
		    		that.hexapod.legs.left[part].knee.setPos(angle);
		    		that.hexapod.legs.right[part].knee.setPos(angle);


		    		that.hexapod.legs.left[part].ankle.setPos(-90+angle);
		    		that.hexapod.legs.right[part].ankle.setPos(-90+angle);
		    	});
				}
			});
		});

		actions.push({
			delay: 0,
			task: function () {
				that.reset();
			}
		});
		actions.push({
			delay:0,
			task: function () {
				if (done) {
					done();
				}
			}
		});
		var q = temporal.queue(actions);

	};




	return that;
}