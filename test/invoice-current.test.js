'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');

var pricing = require('../lib/pricing');
var invoice = require('../lib/invoice');

function item(overrides) {
  return Object.assign({
    id: 1,
    name: 'Test product',
    sku: 'TEST-1',
    price: 1000,
    qty: 1,
    hsn: '1006'
  }, overrides || {});
}

test('invoice matches HSN GST, split, and total used to bill the order', function () {
  var items = [item({ price: 640, hsn: '1006' })];
  var billed = pricing.computeTotals(items, '');
  var invoiced = invoice.computeInvoiceFigures({
    id: 1001,
    items: items,
    coupon: ''
  });

  assert.deepEqual({
    subtotal: invoiced.subtotal,
    discount: invoiced.discount,
    tax: invoiced.tax,
    cgst: invoiced.cgst,
    sgst: invoiced.sgst,
    total: invoiced.total,
    gstPercent: invoiced.rows[0].gstPercent,
    lineTax: invoiced.rows[0].lineTax
  }, {
    subtotal: 640,
    discount: 0,
    tax: 32,
    cgst: 16,
    sgst: 16,
    total: 672,
    gstPercent: 5,
    lineTax: 32
  });
  assert.equal(billed.total, invoiced.total);
});

test('invoice matches order coupon discount and GST breakdown', function () {
  var items = [item({ hsn: '0902' })];
  var billed = pricing.computeTotals(items, 'WELCOME');
  var order = {
    id: 1002,
    items: items,
    coupon: 'WELCOME',
    total: billed.total
  };
  var invoiced = invoice.computeInvoiceFigures(order);
  var html = invoice.render(order);

  assert.deepEqual({
    discount: invoiced.discount,
    tax: invoiced.tax,
    cgst: invoiced.cgst,
    sgst: invoiced.sgst,
    total: invoiced.total,
    lineTax: invoiced.rows[0].lineTax
  }, {
    discount: billed.discount,
    tax: billed.tax,
    cgst: billed.cgst,
    sgst: billed.sgst,
    total: billed.total,
    lineTax: billed.lines[0].tax
  });
  assert.equal(html.includes('<div class="warn-box">'), false);
});

test('invoice respects FLAT50 minimum order like order pricing', function () {
  var items = [item({ price: 100, hsn: '0902' })];
  var billed = pricing.computeTotals(items, 'FLAT50');
  var invoiced = invoice.computeInvoiceFigures({
    id: 1003,
    items: items,
    coupon: 'FLAT50'
  });

  assert.equal(billed.discount, 0);
  assert.equal(invoiced.discount, 0);
  assert.equal(invoiced.tax, billed.tax);
  assert.equal(invoiced.total, billed.total);
});
