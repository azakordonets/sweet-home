var rp = require('request-promise');

var ParserClass = function(config) {
	this.conf = config;
};

ParserClass.prototype.work = function() {
	console.info('Executing \'' + this.conf.name + '\' parser...');

	rp({
		url: this.conf.url
	})




	return new Promise(function(resolve, reject) {

	});
};


module.exports = ParserClass;