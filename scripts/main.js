'use strict';

var log = require('./logger').getLogger('main');
var HandlebarsIntl = require('handlebars-intl');
var Handlebars = require('handlebars');
var notify = require('node-notify');
var Promise = require('bluebird');
var express = require('express');
var fse = require('fs-extra');
var _ = require('lodash');
var fs = require('fs');

var CONF_PATH = './conf/config.json';
var STATE_PATH = getHomePath() + '/sweet-home/state.json';
var DIST_PATH = './dist';
var TEMPLATE_PATH = 'templates/index.hbs';
var INDEX_PATH = DIST_PATH + '/index.html';

var STATE_ENV = 'SWEET_HOME_STATE_FILE';
var ENCODING = 'utf-8';
var SERVER_PORT = 3000;

var interval, parsers = [], template;
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
		.then(generateHtml)
		.then(runServer)
		.then(tryRun)
		.catch(function(err) {
			log.error(err);
		});
}

/*
 * Start local Express server
 */
function runServer () {
	log.info('Starting local webserver on port ' + SERVER_PORT);

	var app = express();
	app.use(express.static(DIST_PATH));
	app.listen(SERVER_PORT)
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
					priceMax: Math.abs(config.priceMax),
					lastId: state.flatId[p.key]
				});
				parsers.push(new Parser(options));

				log.info('Parser \'' + p.name + '\' created.');
			}
		});
	}
}

/*
 * Return environment home path
 */
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
			_.assign(state, json);
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

/*
 * Saves found flats to state file
 */
function storeFlats(flats, ids) {
	var newIdMap = _.map(ids, function(id, key) {
		return key + '_' + id;
	});

	var idMap = _.map(state.flatId, function(id, key) {
		return key + '_' + id;
	});

	var isFlatsChanged = _.isArray(flats) && flats.length > 0;
	var isIdsChanged = _.difference(newIdMap, idMap).length > 0;

	if(isFlatsChanged || isIdsChanged) {
		if(isFlatsChanged) {
			log.info('Saving ' + flats.length + ' found flats.');

			// Notify
			notify({
				title: 'Home, sweet home',
				subtitle: 'New flats found!',
				message: flats.length + ' new flats',
				open: 'http://localhost:' + SERVER_PORT
			})
		}

		if(isIdsChanged) {
			log.info('Updating checked ids.');
		}

		state.flats = state.flats.concat(flats);
		_.assign(state.flatId, ids);

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
 * Generate web site page with found results
 */
function generateHtml() {
	log.debug('Generating results html page');

	getTemplate()
		.then(function(tmpl) {
			return tmpl(getHtmlData());
		})
		.then(function(page){
			var writeFile = Promise.promisify(fs.writeFile);
			return writeFile(INDEX_PATH, page, ENCODING);
		});
}

/*
 * Returs flats array.
 * Sorted by added date, descending
 */
function getHtmlData () {
	return _.sortByOrder(state.flats, ['date', 'id'], ['desc', 'desc']);
}

/*
 * Loads and compiles Handlebars template
 */
function getTemplate () {
	if(!template) {
		HandlebarsIntl.registerWith(Handlebars);

		return Promise.promisify(fs.readFile)(TEMPLATE_PATH, { encoding: ENCODING })
			.then(function(templateSource) {
				template = Handlebars.compile(templateSource);
				return template;
			});
	} else {
		return Promise.resolve(template);
	}
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
		.then(function(result) {
			var flats = [];
			var ids = {};

			_.forEach(result, function(obj) {
				_.assign(ids, obj.ids);
				flats = flats.concat(obj.flats);
			});

			// Remove duplicates, which are already in state
			var filtered = _.filter(flats, function(flat) {
				return !_.find(state.flats, { id: flat.id });
			});

			return storeFlats(filtered, ids);
		})
		.then(generateHtml)
		.catch(log.error.bind(log))
		.finally(function() {
			log.info('Sleep for ' + interval + ' minutes.');
			setTimeout(loop, interval * 60000); // interval is set in minutes
		});
};

module.exports = {
	findHome: start
};