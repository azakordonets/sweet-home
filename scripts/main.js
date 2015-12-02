'use strict';

var jsonfile = require('jsonfile');
var Promise = require('bluebird');
var colors = require('colors');
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
			console.log(colors.red(err));
		});
}

/*
 * Attempt to start loop
 */
function tryRun() {
	if(parsers.length > 0) {
		loop();
	} else {
		console.log('No specified parsers!'.blue);
	}
}

/*
 * Parse configuration file and set runtime parameters
 */
function initParameters (config) {
	interval = (_.isNumber(config.interval) ? config.interval : 1) * 60000; // interval is set in minutes

	if(_.isArray(config.parsers)) {
		_.forEach(config.parsers, function(p) {
			var Parser = require('./parsers/' + p.key);

			if(_.isFunction(Parser)) {
				var options = _.assign({}, p, { recordsLimit: config.recordsLimit, pagesLimit: config.pagesLimit });
				parsers.push(new Parser(options));
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
			return parser.doMagic();
		}))
		.then(function(flats){
			console.log(flats);
		})
		.catch(function(err) {
			console.log(colors.red(err));
		})
		.finally(function() {
			// setTimeout(loop, interval);
		});
};

module.exports = {
	findHome: start
};