'use strict';
const os = require('os');
const fs = require('fs');
const url = require('url');
const path = require('path');
const fetch = require('node-fetch');
const {app, BrowserWindow, dialog, ipcMain} = require('electron');
const receiptRetriever = require('./lib/receiptRetriever');
const certRetriever = require('./lib/certRetriever');
const acrobatReaderUtil = require('./lib/acrobatReaderUtil');
const pfValues = require('./lib/proofshowValues');
const PCCACertChecker = require('pcca-verifier');

global.mainWindow = null;
global.isWin = (os.platform() === 'win32');
global.isMacOS = (os.platform() === 'darwin');
global.tmpFolder = path.join(os.tmpdir(), app.getName());
global.psesData = null;

/**
 * Check application if there is new version
 * @return {boolean} return true if there is new version
 */
 async function checkAppUpdate() {

   try {
     // load latest version
     var fetchRes = await fetch('https://check.proof.show/download/version.json');

     if (fetchRes.ok) {
       var isUpdate = false;
       var latestVer = (await fetchRes.json()).version.split('.');
       var currentVer = app.getVersion().split('.');

       for (let verIdx = 0; verIdx < latestVer.length; verIdx++) {
         if (parseInt(currentVer[verIdx]) > parseInt(latestVer[verIdx]))
          break;
         else if (parseInt(currentVer[verIdx]) < parseInt(latestVer[verIdx])) {
           isUpdate = true;
           break;
         }
       }

       return isUpdate;
     } else {
       return false;
     }
   } catch(err) {
     console.log(err);
     return false;
   }
 }

/**
 *  Retrieve the PSES data
 */
async function retrievePSES() {
  try {
    var psesData = null;
    var fetchRes = await fetch('https://download.ca.proof.show/PSES.json');

    if (fetchRes.ok)
      global.psesData = await fetchRes.json();
    else
      throw fetchRes.statusText;
  } catch (err) {}
}

/**
 *  Verify the certificate with PCCA Verifier
 *  @param {string} pemCert string of certificate in PEM format
 *  @return {number} the verification result
 */
async function verifyCertificate(pemCert) {
  var result = null;

  // retrieve PSES
  await retrievePSES();

  try {
    var certCheckObj = new PCCACertChecker(Buffer.from(pemCert), global.psesData);

    result = await certCheckObj.verify();

    if (result.retCode !== 0)
      throw result;
  } catch (err) {
    throw pfValues.errors.failVerifyCert;
  }
}

/**
 *  Check the ProofShow return receipt
 *  @param {Object} receiptInfo the receipt information object
 */
async function checkReceipt(receiptInfo) {

  try {
    // parse certificate in receipt
    var certList = certRetriever.getCerts(receiptInfo.buffer);

    if (certList.length === 1) {
      // verify certificate
      await verifyCertificate(certList[0]);

      // check Acrobat reader status
      await acrobatReaderUtil.checkAcrobatReader();

      // add certificate to Acrobat trust file
      await acrobatReaderUtil.addTrust(certList[0]);

      // open receipt PDF with Acrobat reader
      await acrobatReaderUtil.openReader(receiptInfo.filePath);
    } else
      throw pfValues.errors.invalidNumCert;
  } catch (err) {
    throw err;
  }
}

/**
 *  Initaite ProofShow Check application
 */
async function initApp() {
  if (await checkAppUpdate()) {
    dialog.showMessageBox({
      type: 'none',
      message: 'There is new version for ProofShow Check, please upgrade it.',
      buttons: ['OK']
    });
    app.quit();
  } else {
    // Create the browser window.
    global.mainWindow = new BrowserWindow({
      width: 500,
      height: 300,
      resizable: false,
      maximizable: false,
      webPreferences: {
        nodeIntegration: true,
        devTools: false
      }
    });
    global.mainWindow.setMenuBarVisibility(false);

    if (process.env.NODE_ENV === 'development')
      global.mainWindow.loadURL('http://localhost:3000/');
    else {
      global.mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'build', 'index.html'),
        protocol: 'file:',
        slashes: true
      }));
    }

    // global.mainWindow.webContents.openDevTools();

    // listen "proc-with-tracking-number" event
    ipcMain.on('proc-with-tracking-number', async function(event, trackingNum, email) {
      try {
        // get receipt information by tracking number
        var receiptInfo = await receiptRetriever.byTrackingNum(trackingNum, email);
        await checkReceipt(receiptInfo);

        setTimeout(function() {
          // send "proc-finish" event
          event.sender.send('proc-finish', null);
          global.mainWindow.close();
        }, 1000);
      } catch (err) {
        if (err.code === pfValues.errors.readerNotFound.code) {
          dialog.showMessageBox(global.mainWindow, {
            type: 'none',
            message: 'This program requires you install Acrobat Reader first.',
            buttons: ['OK']
          });
          event.sender.send('proc-finish', null);
        } else if (err.code === pfValues.errors.readerIsOpening.code) {
          dialog.showMessageBox(global.mainWindow, {
            type: 'none',
            message: 'This program requires you close Acrobat Reader first.',
            buttons: ['OK']
          });
          event.sender.send('proc-finish', null);
        } else {
          console.log(err);
          event.sender.send('proc-finish', err);
        }
      }
    });

    // listen "proc-with-local-file" event
    ipcMain.on('proc-with-local-file', async function(event, filePath) {
      try {
        // get receipt information by file path
        var receiptInfo = await receiptRetriever.byLocalFile(filePath);
        await checkReceipt(receiptInfo);

        setTimeout(function() {
          // send "proc-finish" event
          event.sender.send('proc-finish', null);
          global.mainWindow.close();
        }, 1000);
      } catch (err) {
        if (err.code === pfValues.errors.readerNotFound.code) {
          dialog.showMessageBox(global.mainWindow, {
            type: 'none',
            message: 'This program requires you install Acrobat Reader first.',
            buttons: ['OK']
          });
          event.sender.send('proc-finish', null);
        } else if (err.code === pfValues.errors.readerIsOpening.code) {
          dialog.showMessageBox(global.mainWindow, {
            type: 'none',
            message: 'This program requires you close Acrobat Reader first.',
            buttons: ['OK']
          });
          event.sender.send('proc-finish', null);
        } else {
          event.sender.send('proc-finish', err);
        }
      }
    });

    global.mainWindow.on('closed', function() {
      global.mainWindow = null;
    });
  }
}

// make application as single instance
const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock)
  app.quit();
else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (global.mainWindow) {
      if (global.mainWindow.isMinimized())
        global.mainWindow.restore();

      global.mainWindow.focus();
    }
  });

  app.on('ready', initApp);

  app.on('window-all-closed', function() {
    app.quit();
  });

  app.on('activate', function() {
    if (global.mainWindow === null) initApp();
  });
}
