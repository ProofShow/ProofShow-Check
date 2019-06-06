'use strict';
const {describe, it} = require('mocha');
const {assert} = require('chai');
const fs = require('fs');
const certRetriever = require('../lib/certRetriever');

describe('PDF with 1 singer\'s certificate', function() {

  it('should retrieve 1 certificate', async function() {
    var pdfBuffer = fs.readFileSync('./test/TEST_RECEIPT_01.pdf');
    var certList = certRetriever.getCerts(pdfBuffer);

    assert(certList.length === 1, 'Wrong number of certificate in PDF');
  });
});
