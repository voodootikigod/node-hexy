

module.exports = function(_serialport, _id) {
	var that = this;
	that.id = _id;
	that.serialport = _serialport;
	that.servoPos = 1500;
	that.offset = 0;

	that.getPosDeg = function () {
		return (that.servoPos-1500)/11.1111111;
	}
	that.setPos = function (deg, cb) {
		that.servoPos = (1500.0+(parseFloat(deg)*11.1111111));
		that.move(cb);
	};

	that.kill = function (cb) {
		var cmd = '#'+that.id+'L\r';
		if (process.env.DEBUG) {
			console.log(cmd);
			if (cb) { cb(); }
		} else{
			that.serialport.write(cmd, cb);
		}

	};

	that.move = function (cb) {
		if (that.servoPos < 500) {
			that.servoPos = 500;
		} else if (that.servoPos > 2500) {
			that.servoPos = 2500;
		}
		var pos = that.servoPos;
		pos = parseInt(pos);
		if (that.servoPos < 1000) {
			pos = '0'+pos;
		}



		var cmd = '#'+that.id+'P'+pos+'T0\r';

		if (process.env.DEBUG) {
			console.log(cmd);
			if (cb) { cb(); }
		} else {
			that.serialport.write(cmd, cb);
		}
	};


	return that;
}
