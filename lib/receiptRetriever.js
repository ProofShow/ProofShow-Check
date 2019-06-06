'use strict';
const fs = require('fs-extra');
const path = require('path');
const {app} = require('electron');
const fetch = require('node-fetch');
const pfValues = require('./proofshowValues');

const GET_RECEIPT_URL = 'https://api.proof.show/v1/get-proof';

/**
 *  Get receipt file information with local file
 *  @param {string} filePath the path of a local receipt file
 *  @return {Object} the information of the receipt file
 */
async function _readLocalFileReceipt(filePath) {
  var receiptBuffer = fs.readFileSync(filePath);

  return {buffer: receiptBuffer, filePath: filePath};
}

/**
 *  Get receipt file information with receiptID
 *  @param {string} receiptID the ID of a receipt
 *  @return {Object} the information of the receipt file
 */
async function _readRmoteReceipt(receiptID) {
  var receiptBuffer = null;
  var receiptTempPath = path.join(global.tmpFolder, `${receiptID}.pdf`);

  // check local cache receipt
  try {
    receiptBuffer = fs.readFileSync(receiptTempPath);
  } catch(err) {
    // no local cache receipt found
  }

  if (!receiptBuffer) {
    // download receipt
    var options = {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf'
      }
    };
    var fetchRes = await fetch(GET_RECEIPT_URL + '?receiptID=' + receiptID, options);

    if (fetchRes.ok) {
      receiptBuffer = await fetchRes.buffer();

      // cache the receipt
      fs.ensureDirSync(global.tmpFolder);
      fs.writeFileSync(receiptTempPath, receiptBuffer);
    } else {
      throw pfValues.errors.failDownload;
    }
  }

  return {buffer: receiptBuffer, filePath: receiptTempPath};
}

module.exports.byLocalFile = _readLocalFileReceipt;
module.exports.byReceiptID = _readRmoteReceipt;
