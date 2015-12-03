var BaseClass = require('../baseParser');
var htmlparser = require('htmlparser2');
var util = require('util');
var _ = require('lodash');

var URL = 'http://www.funda.nl';
var SEARCH_URL = '/huur/amsterdam/sorteer-datum-af';
var PAGE = '/p';
var ID_PREFIX = 'saveObject';

var FundaParser = function(config) {
	BaseClass.call(this, config);
}

util.inherits(FundaParser, BaseClass);

FundaParser.prototype.getPageUrl = function(pageNumber) {
	return URL + SEARCH_URL + PAGE + (pageNumber + 1);
};

FundaParser.prototype.getFlatNodes = function(dom) {
	return htmlparser.DomUtils.findAll(function(el) {
		var p = el.parent;

		return p &&
			p.name == 'ul' &&
			p.attribs['class'] == 'object-list' &&
			el.name == 'li' &&
			el.attribs['class'].indexOf('nvm') != -1;
	}, dom);
};

FundaParser.prototype.getFlatObject = function(node) {

	var utils = htmlparser.DomUtils;

	var priceNode = utils.findOne(function(el) {
		var p = el.parent;
		return el.name == 'span' && el.attribs['class'] == 'price' && p.name == 'span' && p.attribs['class'] == 'price-wrapper';
	}, [node]);

	var link = _.result(_.find(node.children, function(el) {
		return el.name == 'a';
	}), 'attribs.href');

	var idStr = _.result(utils.findOne(function(el) {
		return el.name == 'a' && _.startsWith(el.attribs.id, ID_PREFIX);
	}, [node]), 'attribs.id');

	return {
		id: idStr.replace(ID_PREFIX, ''),
		price: parseInt(utils.getText(priceNode).replace(/[^0-9]/gi, '')),
		link: URL + link
	}
};

module.exports = FundaParser;