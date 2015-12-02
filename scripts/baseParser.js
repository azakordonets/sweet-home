'use strict';

var rp = require('request-promise');
var htmlparser = require('htmlparser2');
var Promise = require('bluebird');
var colors = require('colors');
var _ = require('lodash');

var ParserClass = function(config) {
	this.conf = config;
};

ParserClass.prototype.doMagic = function() {
	console.info(('Executing \'' + this.conf.name + '\' parser...').blue);

	var options = {
		page: 0,
		processed: 0,
		foundLast: false
	};

	return this.processPage(options);
};

ParserClass.prototype.processPage = function(options) {
	var _this = this;

	return this.doRequest(options.page)
		.then(this.getDOM.bind(this))
		.then(this.getFlatNodes.bind(this))
		.then(function(nodes) {

			var flats = [];
			_.forEach(nodes, function(node) {
				var obj = _this.getFlatObject(node);
				obj = _this.filterFlat(obj);

				if(obj) {
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
				console.log(('Parser \'' + _this.conf.name + '\' finished.\nFlats processed: ' + options.processed + '. Pages processed: ' + options.page + '.').green);
				return Promise.resolve(flats);
			}
		})
		.catch(function(err) {
			console.log(('ERROR: Parser \'' + _this.conf.name + '\' failed.\n' + err).red);
		});
};

ParserClass.prototype.processFlat = function(flat) {




	return false;
};

ParserClass.prototype.filterFlat = function(flat) {
	return flat;
};

ParserClass.prototype.doRequest = function(pageNumber) {
	return rp({ url: this.getPageUrl(pageNumber) });
};

ParserClass.prototype.getDOM = function(html) {
	var handler;

	var promise = new Promise(function(resolve, reject) {
		handler = new htmlparser.DomHandler(function (error, dom) {
		    if (error) {
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