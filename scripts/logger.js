var log4js = require('log4js');

log4js.configure({
	appenders: [
		{
			type: 'console'
		}
	],
	levels: {
		'[all]': 'INFO'
	}
});

module.exports = log4js;