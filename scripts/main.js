'use strict';

var jsonfile = require('jsonfile');
var Promise = require('bluebird');
var colors = require('colors');
var fs = require('fs');
var _ = require('lodash');

var CONF_PATH = './conf/config.json';
var STATE_PATH = '~/sweet-home/state.json';

var interval, parsers = [];
var state = {
	"flats": [],
	"flatId": {}
};

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
	return Promise.promisify(jsonfile.readFile)(CONF_PATH);
}

/*
 * Loads json state file. If file doesn't exist - will create default state structure.
 * Returns a Promise, which resolves to state object
 */
function getState() {
	return Promise.promisify(jsonfile.readFile)(getStatePath())
		.then(function(json){
			return _.assign(state, json);
		},
		function(error) {
			return Promise.resolve(state);
		});
}

/*
 * Calculates and returns state file path
 */
function getStatePath() {
	return STATE_PATH;
}

function storeFlats(flats) {
	if(_.isArray(flats) && flats.length > 0) {

		// Create file, if it's not created
		var path = getStatePath();
		fs.exists(path, function(exist) {
			if(!exist){
				fs.closeSync(fs.openSync(path, 'w'));
			}
		});
	}
}

/*
 * Main loop
 */
function loop() {


	// storeFlats([1]);

	getState().then(function(r){ console.log(1, r)}, function(r) { console.log(2, r)});

	return;
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