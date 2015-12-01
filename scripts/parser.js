'use strict';

var rp = require('request-promise');
var htmlparser = require('htmlparser2');
var Promise = require('bluebird');
var colors = require('colors');
var _ = require('lodash');

var ParserClass = function(config, listLimit, pageLimit) {
	this.conf = config;
	this.listLimit = listLimit;
	this.pageLimit = pageLimit;
};

ParserClass.prototype.getCandidates = function() {
	console.info(colors.blue('Executing \'' + this.conf.name + '\' parser...'));

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
		.then(this.getListNode.bind(this))
		.then(this.getListItems.bind(this))
		.then(function(items) {
			
			for(var i = 0, l = items.length; i < l; i++) {
				var flatObj = _this.getFlatObject(items[i]);
				_this.analizeFlat(flatObj, options);

				if(++options.processed >= _this.listLimit || options.foundLast) {
					break;
				}
			}

			if(!options.foundLast && ++options.page < _this.pageLimit && options.processed < _this.listLimit) {
				return _this.processPage(options);
			} else {
				console.log(colors.green('Parser \'' + _this.conf.name + '\' finished.\nFlats processed: ' + options.processed + '. Pages processed: ' + options.page + '.'));
			}

		})
		.catch(function(err) {
			console.log(colors.red('Parser \'' + _this.conf.name + '\' failed with error:\n' + err));
		});
};

ParserClass.prototype.getFlatObject = function(node) {
	var utils = htmlparser.DomUtils;

	var priceNode = utils.findOne(function(el) {
		return el.name == 'b' && el.parent.name == 'strong' && el.parent.attribs['class'] == 'price';
	}, [node]);

	var linkNode = utils.findOne(function(el) {
		return el.name == 'a' && el.parent.name == 'div' && el.parent.attribs['class'] == 'addressTitle';
	}, [node]);

	var link = linkNode.attribs.href;
	var id = _.find(link.split("/"), function(str) {
		return str.indexOf("PR0") != -1;
	});

	return {
		id: id,
		price: parseInt(utils.getText(priceNode).replace(/[^0-9]/gi, '')),
		link: this.conf.url + link
	}
};

ParserClass.prototype.analizeFlat = function(flat, options) {
	console.log(flat);
};

ParserClass.prototype.doRequest = function(page) {
	var pageParam = this.conf.pageParam.replace('{pageParam}', page + 1);
	return rp({
		url: this.conf.url + this.conf.searchUrl + pageParam
	});
};

ParserClass.prototype.getListNode = function(html) {
	var handler;
	var testFunc = this.getTestFunc(this.conf.listNode);

	var promise = new Promise(function(resolve, reject) {
		handler = new htmlparser.DomHandler(function (error, dom) {
		    if (error) {
		    	reject(error);
		    } else {
		    	var listNode = htmlparser.DomUtils.findOne(testFunc, dom);
		    	if(listNode) {
		    		resolve(listNode);	
		    	} else {
		    		reject("No list block found!");
		    	}
		    }
		});
	});

	var parser = new htmlparser.Parser(handler);
	parser.write(html);
	parser.done();

	return promise;
};

ParserClass.prototype.getListItems = function(node) {
	return htmlparser.DomUtils.getElements({
		"class": function(className) {
			return _.isString(className) && className.indexOf('row-') != -1;
		}
	}, node, true);
};

ParserClass.prototype.getTestFunc = function(config) {
	var id = config.id;

	return function(elem) {
		return htmlparser.DomUtils.isTag(elem) && 
			(id ? (elem.attribs && elem.attribs.id == id) : true);
	};
};

module.exports = ParserClass;