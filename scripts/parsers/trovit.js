var BaseClass = require('../baseParser');
var htmlparser = require('htmlparser2');
var util = require('util');
var _ = require('lodash');

var URL = 'http://huizen.trovit.nl';
var SEARCH_URL = '/index.php/cod.search_homes/type.2/what_d.amsterdam/orderby.source_date';
var PAGE = '/page.';

var TrovitParser = function(config) {
	BaseClass.call(this, config);
}

util.inherits(TrovitParser, BaseClass);

TrovitParser.prototype.getPageUrl = function(pageNumber) {
	return URL + SEARCH_URL + PAGE + (pageNumber + 1);
};

TrovitParser.prototype.getFlatNodes = function(dom) {
	return htmlparser.DomUtils.findAll(function(el) {
		var p = el.parent || {};
		var pcn = p && p.attribs ? p.attribs['class'] : null;
		var cn = el.attribs['class'];
		return el.name == 'div' && _.isString(cn) && cn.indexOf('listing') != -1 && cn.indexOf('item-venus') != -1 && _.isString(pcn) && pcn.indexOf('search_venus_list') != -1
	}, dom);
};

TrovitParser.prototype.getFlatObject = function(node) {

	var utils = htmlparser.DomUtils;

	var priceNode = utils.findOne(function(el) {
		var p = el.parent;
		return el.name == 'div' && p && p.name == 'div' && el.attribs['class'] == 'price' && p.attribs['class'] == 'rightInfo';
	}, [node]);

	var id = node.attribs['data-id'];

	var linkNode = utils.findOne(function(el) {
		var p = el.parent;
		return el.name == 'a' && p && p.name == 'h4' && p.attribs['itemprop'] == 'name';
	}, [node]);

	var baseObj = BaseClass.prototype.getFlatObject.call(this, node);
	return _.assign(baseObj, {
		id: id,
		price: parseInt(utils.getText(priceNode).replace(/[^0-9]/gi, '')),
		link: linkNode.attribs['href']
	});
};

module.exports = TrovitParser;