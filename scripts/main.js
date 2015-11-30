var jsonfile = require('jsonfile');
var Promise = require('bluebird');
var _ = require('lodash');

var CONF_PATH = './conf/config.json';

var interval, parsers = [];

/*
 * Main entry point
 */
function start() {
	getConfig()
		.then(initParameters)
		.then(tryRun)
		.catch(function(err) {
			console.error(err);
		});
}

/*
 * Attempt to start loop
 */
function tryRun() {
	if(parsers.length > 0) {
		loop();
	} else {
		console.log('No specified parsers!');
	}
}

/*
 * Parse configuration file and set runtime parameters
 */
function initParameters (config) {
	interval = (_.isNumber(config.interval) ? config.interval : 30) * 60000; // interval is set in minutes

	if(_.isArray(config.parsers)) {
		_.forEach(config.parsers, function(p) {
			var ParserClass = require('./parsers/' + p.key + '.js');
			if(_.isFunction(ParserClass)) {
				parsers.push(new ParserClass(p));
			}
		});
	}
}

/*
 * Loads json configuration file.
 * Returns a Promise, which resolves to configuration file
 */
function getConfig() {
	var readFile = Promise.promisify(jsonfile.readFile);
	return readFile(CONF_PATH);
}

/*
 * Main loop
 */
function loop() {
	Promise
		.all(_.map(parsers, function(parser) {
			return parser.work();
		}))
		.catch(function(err) {
			console.error(err);
		})
		.finally(function() {
			setTimeout(loop, interval);
		});
};

module.exports = {
	findHome: start
};