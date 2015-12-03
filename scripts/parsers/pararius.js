var BaseClass = require('../baseParser');
var htmlparser = require('htmlparser2');
var util = require('util');
var _ = require('lodash');

var URL = 'http://www.pararius.com';
var SEARCH_URL = '/apartments/amsterdam/insert-date-descending';
var PAGE = '/page-';

var ParariusParser = function(config) {
	BaseClass.call(this, config);
}

util.inherits(ParariusParser, BaseClass);

ParariusParser.prototype.getPageUrl = function(pageNumber) {
	return URL + SEARCH_URL + PAGE + (pageNumber + 1);
};

ParariusParser.prototype.getFlatNodes = function(dom) {
	return htmlparser.DomUtils.findAll(function(el) {
		var p = el.parent || {};
		var cn = el.attribs && el.attribs['class'];
		return p.attribs && p.attribs.id == 'resultset' && el.name == 'li' && _.isString(cn) && cn.indexOf('row-') != -1;
	}, dom);
};

ParariusParser.prototype.getFlatObject = function(node) {
	var utils = htmlparser.DomUtils;

	var priceNode = utils.findOne(function(el) {
		var p = el.parent;
		return el.name == 'b' && p && p.name == 'strong' && p.attribs['class'] == 'price';
	}, [node]);

	var link = _.result(utils.findOne(function(el) {
		var p = el.parent;
		return el.name == 'a' && p.name == 'div' && p.attribs['class'] == 'addressTitle';
	}, [node]), 'attribs.href');

	var id = _.find(link.split("/"), function(str) {
		return str.indexOf("PR0") != -1;
	});

	return {
		id: id,
		price: parseInt(utils.getText(priceNode).replace(/[^0-9]/gi, '')),
		link: URL + link
	}
};

module.exports = ParariusParser;