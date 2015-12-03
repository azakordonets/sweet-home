'use strict';

var rp = require('request-promise');
var htmlparser = require('htmlparser2');
var Promise = require('bluebird');
var logger = require('./logger')
var _ = require('lodash');

var log;

var ParserClass = function(config) {
	this.conf = config;

	log = logger.getLogger(config.key);
};

ParserClass.prototype.doMagic = function() {
	log.info('Executing \'' + this.conf.name + '\' parser');

	var options = {
		page: 0,
		processed: 0,
		foundLast: false
	};

	return this.processPage(options);
};

ParserClass.prototype.processPage = function(options) {
	var _this = this;

	log.debug('Process page ' + options.page);

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
				log.debug('Parser \'' + _this.conf.name + '\' finished.');
				log.debug('Flats processed: ' + options.processed + '. Pages processed: ' + options.page + '.');
				
				return Promise.resolve(flats);
			}
		})
		.catch(function(err) {
			log.error('Parser \'' + _this.conf.name + '\' failed.');
			log.error(err);
		});
};

ParserClass.prototype.processFlat = function(flat) {
	// TODO
	return false;
};

ParserClass.prototype.includeFlat = function(flat) {
	return (!this.conf.priceMin || flat.price >= this.conf.priceMin) && (!this.conf.priceMax || flat.price <= this.conf.priceMax);
};

ParserClass.prototype.doRequest = function(pageNumber) {
	return rp({ url: this.getPageUrl(pageNumber) });
};

ParserClass.prototype.getDOM = function(html) {
	var handler;

	log.debug('Build loaded page DOM.');

	var promise = new Promise(function(resolve, reject) {
		handler = new htmlparser.DomHandler(function (error, dom) {
		    if (error) {
		    	log.error('Failed DOM initialization.');
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

ParserClass.prototype.getPageUrl = function(pageNumber) {
	throw new Error('Method \'getPageUrl\' not implemented in \'' + this.conf.name + '\' parser.');
};

ParserClass.prototype.getFlatNodes = function(pageNumber) {
	throw new Error('Method \'getFlatNodes\' not implemented in \'' + this.conf.name + '\' parser.');
};

ParserClass.prototype.getFlatObject = function(pageNumber) {
	throw new Error('Method \'getFlatObject\' not implemented in \'' + this.conf.name + '\' parser.');
};

module.exports = ParserClass;