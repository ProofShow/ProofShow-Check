'use strict';
const fs = require('fs-extra');
const path = require('path');
const {app} = require('electron');
const fetch = require('node-fetch');
const pfValues = require('./proofshowValues');

const GET_RECEIPT_URL = 'https://api.proof.show/v1/get-receipt';

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
 *  Get receipt file information with tracing number and email
 *  @param {string} trackingNum the tracking number of receipt to search
 *  @param {string} email the email of receipt to search
 *  @return {Object} the information of the receipt file
 */
async function _readRmoteReceipt(courier, trackingNum, email) {
  var receiptBuffer = null;
  var receiptTempPath = '';

  // download receipt
  var options = {
    method: 'GET',
    headers: {
      'Accept': 'application/pdf'
    }
  };
  var fetchRes = await fetch(`${GET_RECEIPT_URL}?courier=${courier}&trackingNumber=${trackingNum}&recipientEmail=${email}`, options);

  if (fetchRes.ok) {
    receiptBuffer = await fetchRes.buffer();

    // cache the receipt
    receiptTempPath = path.join(global.tmpFolder, `${trackingNum}.pdf`);
    fs.ensureDirSync(global.tmpFolder);
    fs.writeFileSync(receiptTempPath, receiptBuffer);
  } else {
    throw pfValues.errors.failDownload;
  }

  return {buffer: receiptBuffer, filePath: receiptTempPath};
}

module.exports.byLocalFile = _readLocalFileReceipt;
module.exports.byTrackingNum = _readRmoteReceipt;
