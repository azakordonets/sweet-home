'use strict';

var rp = require('request-promise');
var htmlparser = require('htmlparser2');
var Promise = require('bluebird');
var colors = require('colors');

var ParserClass = function(config, limit) {
	this.conf = config;
	this.limit = limit;
};

ParserClass.prototype.getCandidates = function() {
	console.info(colors.blue('Executing \'' + this.conf.name + '\' parser...'));

	var _this = this;
	var page = 1;
	var processed = 0;
	var foundLast = false;

	this.doRequest(page)
		.then(function(html) {
			return _this.getListBlock(html);
		})
		.then(function(listBlock) {
			console.log(listBlock);
		});

	return true;
};

ParserClass.prototype.doRequest = function(page) {
	var pageParam = this.conf.pageParam.replace('{pageParam}', page);
	return rp({
		url: this.conf.url + pageParam
	});
};

ParserClass.prototype.getListBlock = function(html) {
	var handler;
	var promise = new Promise(function(resolve, reject) {
		handler = new htmlparser.DomHandler(function (error, dom) {
		    if (error) {
		    	reject(error);
		    } else {
		    	var listBlock = htmlparser.DomUtils.findOne(function(elem){
		    		return elem.type == 'tag' && elem.name == 'ul' && elem.attribs['id'] == 'resultset';
		    	}, dom);

		    	resolve(listBlock);
		    }
		});
	});

	var parser = new htmlparser.Parser(handler);
	parser.write(html);
	parser.done();

	return promise;
};

module.exports = ParserClass;