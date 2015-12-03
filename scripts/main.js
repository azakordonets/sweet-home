'use strict';

var Promise = require('bluebird');
var log = require('./logger').getLogger('main');
var fse = require('fs-extra');
var _ = require('lodash');

var CONF_PATH = './conf/config.json';
var STATE_PATH = getHomePath() + '/sweet-home/state.json';

var STATE_ENV = 'SWEET_HOME_STATE_FILE';

var interval, parsers = [];
var state = {
	"flats": [],
	"flatId": {}
};

/*
 * Main entry point
 */
function start() {
	loadState()
		.then(getConfig)
		.then(initParameters)
		.then(tryRun)
		.catch(function(err) {
			log.error(err);
		});
}

/*
 * Attempt to start loop
 */
function tryRun() {
	if(parsers.length > 0) {
		loop();
	} else {
		log.warn('No specified parsers!');
	}
}

/*
 * Parse configuration file and set runtime parameters
 */
function initParameters (config) {
	log.debug('Setting default parameters');

	interval = _.isNumber(config.interval) ? Math.abs(config.interval) : 1;

	log.debug('Parsers initialization');
	if(_.isArray(config.parsers)) {
		_.forEach(config.parsers, function(p) {
			var Parser = require('./parsers/' + p.key);

			if(_.isFunction(Parser)) {
				var options = _.assign({}, p, {
					recordsLimit: config.recordsLimit,
					pagesLimit: config.pagesLimit,
					priceMin: Math.abs(config.priceMin),
					priceMax: Math.abs(config.priceMax)
				});
				parsers.push(new Parser(options));

				log.info('Parser \'' + p.name + '\' created.');
			}
		});
	}
}

function getHomePath() {
	return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

/*
 * Loads json configuration file.
 * Returns a Promise, which resolves to configuration file
 */
function getConfig() {
	log.debug('Reading configuration file');

	return Promise.promisify(fse.readJson)(CONF_PATH)
		.catch(function(err) {
			log.error('Unable to read configuration file!')
			throw err;
		});
}

/*
 * Loads json state file. If file doesn't exist - will create default state structure.
 * Returns a Promise
 */
function loadState() {
	log.debug('Reading state file');

	return Promise.promisify(fse.readJson)(getStatePath())
		.then(function(json){
			_.merge(state, json);
		},
		function(error) {
			log.warn('No state file or state data is invalid.');
			log.info('Use default state.');
		});
}

/*
 * Calculates and returns state file path
 */
function getStatePath() {
	return process.env[STATE_ENV] || STATE_PATH;
}

function storeFlats(flats) {
	if(_.isArray(flats) && flats.length > 0) {
		log.info('Saving ' + flats.length + ' found flats.');

		state.flats = state.flats.concat(flats);

		var ensureFile = Promise.promisify(fse.ensureFile);
		var writeJson = Promise.promisify(fse.writeJson);

		return ensureFile(getStatePath())
			.then(function() {
				return writeJson(getStatePath(), state, { spaces: 2 })
			})
			.catch(function(err) {
				log.error('Unable to store state file!');
				throw err;
			});
	} else {
		log.info('No flats to store.')
	};
}

/*
 * Main loop
 */
function loop() {
	log.info('----- loop -----');

	Promise
		.all(_.map(parsers, function(parser) {
			return parser.doMagic();
		}))
		.then(function(flats) {
			return storeFlats(Array.prototype.concat.apply([], flats));
		})
		.catch(log.error.bind(log))
		.finally(function() {
			log.info('Sleep for ' + interval + ' minutes.');
			setTimeout(loop, interval * 60000); // interval is set in minutes
		});
};

module.exports = {
	findHome: start
};