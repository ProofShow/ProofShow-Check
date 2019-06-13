'use strict';
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const {app, dialog} = require('electron');
const findProc = require('find-process');
const fetch = require('node-fetch');
const spawn = require('child_process').spawn;
const pfValues = require('./proofshowValues');

const readerPathOnWin = [
  {binPath: 'C:\\Program Files (x86)\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe', trustPath: '\\Adobe\\Acrobat\\DC\\Security\\addressbook.acrodata'},
  {binPath: 'C:\\Program Files (x86)\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe', trustPath: '\\Adobe\\Acrobat\\DC\\Security\\addressbook.acrodata'},
  {binPath: 'C:\\Program Files (x86)\\Adobe\\Reader 11.0\\Reader\\AcroRd32.exe', trustPath: '\\Adobe\\Acrobat\\11.0\\Security\\addressbook.acrodata'},
  {binPath: 'C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe', trustPath: '\\Adobe\\Acrobat\\DC\\Security\\addressbook.acrodata'},
  {binPath: 'C:\\Program Files\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe', trustPath: '\\Adobe\\Acrobat\\DC\\Security\\addressbook.acrodata'},
  {binPath: 'C:\\Program Files\\Adobe\\Reader 11.0\\Reader\\AcroRd32.exe', trustPath: '\\Adobe\\Acrobat\\11.0\\Security\\addressbook.acrodata'}
];
const readerPathOnMac = [
  {binPath: '/Applications/Adobe Acrobat DC/Adobe Acrobat.app', trustPath: '/Library/Application Support/Adobe/Acrobat/DC/Security/addressbook.acrodata'},
  {binPath: '/Applications/Adobe Acrobat Reader DC.app', trustPath: '/Library/Application Support/Adobe/Acrobat/DC/Security/addressbook.acrodata'},
  {binPath: '/Applications/Adobe Reader.app', trustPath: '/Library/Application Support/Adobe/Acrobat/11.0/Security/addressbook.acrodata'}
];

const findProcKeyWordOnWin = [
  'Acrobat.exe',
  'AcroRd32.exe'
];
const findProcKeyWordOnMac = [
  '/Contents/MacOS/AdobeAcrobat',
  '/Contents/MacOS/AdobeReader'
];

/**
 *  Get the path of addressbook.acrodata for different platform
 *  @return {string} the path of addressbook.acrodata
 */
function _getTrustFilePath() {
  var trustFilePath = null;
  var acrobatPathList = null;

  if (global.isWin)
    acrobatPathList = readerPathOnWin;
  else if (global.isMacOS)
    acrobatPathList = readerPathOnMac;
  else
    throw 'Unsupported platform';

  for (let pathIdx = 0; pathIdx < acrobatPathList.length; pathIdx++) {
    try {
      if (fs.existsSync(acrobatPathList[pathIdx].binPath)) {
        if (global.isWin)
          trustFilePath = path.join(process.env.APPDATA, acrobatPathList[pathIdx].trustPath);
        else if (global.isMacOS)
          trustFilePath = path.join(process.env.HOME, acrobatPathList[pathIdx].trustPath);
        break;
      }
    } catch (err) {}
  }

  return trustFilePath;
}

/**
 * Check the installation status of Acrobat reader
 * @return {string} the installation path of Acrobat reader
 */
function _checkReaderInstalled() {
  var installedPath = null;
  var acrobatPathList = null;

  if (global.isWin)
    acrobatPathList = readerPathOnWin;
  else if (global.isMacOS)
    acrobatPathList = readerPathOnMac;
  else
    throw 'Unsupported platform';

  for (let pathIdx = 0; pathIdx < acrobatPathList.length; pathIdx++) {
    try {
      if (fs.existsSync(acrobatPathList[pathIdx].binPath)) {
        installedPath = acrobatPathList[pathIdx].binPath;
        break;
      }
    } catch (err) {}
  }

  return installedPath;
}

/**
 *  Check the status of Acrobat reader
 */
async function _checkAcrobatReader() {
  var isOpening = false;
  var installedReader = _checkReaderInstalled();
  var findProcKeyWordList = null;

  // check if Acrobat reader is installed or not
  if (installedReader) {
    if (global.isWin)
      findProcKeyWordList = findProcKeyWordOnWin;
    else if (global.isMacOS)
      findProcKeyWordList = findProcKeyWordOnMac;
    else
      throw 'Unsupported platform';

    // check if Acrobat reader is running or not
    for (let findIdx = 0; findIdx < findProcKeyWordList.length; findIdx++) {
      let findedList = await findProc('name', findProcKeyWordList[findIdx]);

      if (findedList.length > 0) {
        isOpening = true;
        break;
      }
    }

    if (isOpening)
      throw pfValues.errors.readerIsOpening;
  } else
    throw pfValues.errors.readerNotFound;
}

/**
 *  Add certificate the Acrobat trust file
 *  @param {string} pemCert string of a certificate in PEM format
 */
async function _addTrust(pemCert) {
  try {
    // get a customize acrodata
    var postData = {
      cert: pemCert
    };
    var retData = null;

    var options = {
      method: 'POST',
      body: JSON.stringify(postData)
    };
    var fetchRes = await fetch('https://api.proof.show/v1/req-acrodata', options);

    if (fetchRes.ok) {
      retData = await fetchRes.json();

      // replace the local acrodata
      if (retData.code === 0) {
        fs.writeFileSync(_getTrustFilePath(), Buffer.from(retData.acrodata, 'base64'));
      } else
        throw 'Get Error code: '+ retData.code;
    } else
      throw 'invalid HTTP code: ' + fetchRes.status;
  } catch (err) {
    throw pfValues.errors.failAddTrust;
  }
}

/**
 * Open PDF with Acrobat reader
 * @param {string} pdfPath the path of PDF file
 */
async function _openReader(pdfPath) {
  var spawnProc = null;
  var installedReader = _checkReaderInstalled();

  // check if Acrobat reader is installed or not
  if (installedReader) {
    if (global.isWin) {
      spawnProc = await spawn(installedReader, [pdfPath], {
        detached: true,
        stdio: 'ignore'
      });
      spawnProc.unref();
    } else if (global.isMacOS) {
      spawnProc = await spawn('open', [installedReader, pdfPath], {
        detached: true,
        stdio: 'ignore'
      });
      spawnProc.unref();
    } else
      throw 'Unsupported platform';
  } else
    throw pfValues.errors.readNotFound;
}

module.exports.checkAcrobatReader = _checkAcrobatReader;
module.exports.addTrust = _addTrust;
module.exports.openReader = _openReader;
