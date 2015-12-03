'use strict';

var rp = require('request-promise');
var htmlparser = require('htmlparser2');
var Promise = require('bluebird');
var logger = require('./logger')
var _ = require('lodash');

var ParserClass = function(config) {
	this.conf = config;
	this.log = logger.getLogger(config.key);
};

/*
 * Main entry point
 */
ParserClass.prototype.doMagic = function() {
	this.log.info('Executing \'' + this.conf.name + '\' parser');

	var options = {
		page: 0,
		processed: 0,
		foundLast: false
	};

	return this.processPage(options);
};

/*
 * Downloads one website page, parses it and process items on it
 */
ParserClass.prototype.processPage = function(options) {
	var _this = this;

	this.log.debug('Process page ' + options.page);

	return this.doRequest(options.page)
		.then(this.getDOM.bind(this))
		.then(this.getFlatNodes.bind(this))
		.then(function(nodes) {

			var flats = [];
			_.forEach(nodes, function(node) {
				var obj = _this.getFlatObject(node);

				if(_this.includeFlat(obj)) {
					flats.push(obj);
				}

				options.foundLast = _this.processFlat(obj);

				return ++options.processed < _this.conf.recordsLimit && !options.foundLast;
			});

			if(!options.foundLast && ++options.page < _this.conf.pagesLimit && options.processed < _this.conf.recordsLimit) {
				return _this.processPage(options).then(function(pageFlats) {
					return pageFlats.concat(flats);
				});
			} else {
				_this.log.debug('Parser \'' + _this.conf.name + '\' finished.');
				_this.log.debug('Flats processed: ' + options.processed + '. Pages processed: ' + options.page + '.');
				
				return Promise.resolve(flats);
			}
		})
		.catch(function(err) {
			_this.log.error('Parser \'' + _this.conf.name + '\' failed.');
			_this.log.error(err);
		});
};

/*
 *
 */
ParserClass.prototype.processFlat = function(flat) {
	// TODO
	return false;
};

/*
 * Do check, is the current flat fulfill requirements
 */
ParserClass.prototype.includeFlat = function(flat) {
	return flat && flat.price && flat.id && flat.link &&
		(!this.conf.priceMin || flat.price >= this.conf.priceMin) && 
		(!this.conf.priceMax || flat.price <= this.conf.priceMax);
};

/*
 * Do actual HTTP request for a page
 */
ParserClass.prototype.doRequest = function(pageNumber) {
	return rp({ url: this.getPageUrl(pageNumber) });
};

/*
 * Parse page's html and return DOM structure
 */
ParserClass.prototype.getDOM = function(html) {
	var handler;
	var _this = this;

	this.log.debug('Build loaded page DOM.');

	var promise = new Promise(function(resolve, reject) {
		handler = new htmlparser.DomHandler(function (error, dom) {
		    if (error) {
		    	_this.log.error('Failed DOM initialization.');
		    	reject(error);
		    } else {
		    	resolve(dom);
		    }
		});
	});

	var parser = new htmlparser.Parser(handler);
	parser.write(html);
	parser.done();

	return promise;
};

/*
 * Returns page url with a page number
 * Should be implemented in child class
 */
ParserClass.prototype.getPageUrl = function(pageNumber) {
	throw new Error('Method \'getPageUrl\' not implemented in \'' + this.conf.name + '\' parser.');
};

/*
 * Returns collection on DOM nodes with flats out of the page DOM
 * Should be implemented in child class
 */
ParserClass.prototype.getFlatNodes = function(dom) {
	throw new Error('Method \'getFlatNodes\' not implemented in \'' + this.conf.name + '\' parser.');
};

/*
 * Returns flat JSON out of the DOM node
 * Should be implemented in child class
 */
ParserClass.prototype.getFlatObject = function(node) {
	throw new Error('Method \'getFlatObject\' not implemented in \'' + this.conf.name + '\' parser.');
};

module.exports = ParserClass;