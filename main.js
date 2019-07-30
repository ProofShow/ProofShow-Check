'use strict';
const os = require('os');
const fs = require('fs');
const url = require('url');
const path = require('path');
const fetch = require('node-fetch');
const {app, BrowserWindow, dialog, ipcMain, shell} = require('electron');
const receiptRetriever = require('./lib/receiptRetriever');
const certRetriever = require('./lib/certRetriever');
const acrobatReaderUtil = require('./lib/acrobatReaderUtil');
const pfValues = require('./lib/proofshowValues');
const PCCACertChecker = require('pcca-verifier');
const i18nLang = require('./locale/i18n');

global.i18n = null;
global.mainWindow = null;
global.isWin = (os.platform() === 'win32');
global.isMacOS = (os.platform() === 'darwin');
global.tmpFolder = path.join(os.tmpdir(), app.getName());
global.settingFilePath = path.join(app.getPath('userData'), '.setting');
global.settingData = null;
global.psesData = null;
global.countries = require('./resources/countries.json').countries;
global.couriers = require('./resources/couriers.json').couriers;

/**
 * Load application setting data
 */
async function loadSettingData() {
  try {
    global.settingData = JSON.parse(fs.readFileSync(global.settingFilePath).toString());
  } catch(err) {
    global.settingData = {locale: 'en'};

    try {
      fs.writeFileSync(global.settingFilePath, JSON.stringify(global.settingData));
    } catch(err) {}
  }
}

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
 * Normalize the input tracking number
 */
function nomalizeTrackingNum(courier, trackingNumber) {
  var normalizedNum = trackingNumber.replace(/[^a-zA-Z0-9]/g, "");

  switch(courier) {
    case '2':
      // normalize Fedex tracking number
      normalizedNum = normalizedNum.padStart(14, '0');
      break;
  }

  return normalizedNum;
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
  await loadSettingData();
  global.i18n = new i18nLang(global.settingData.locale);

  // Create the browser window.
  global.mainWindow = new BrowserWindow({
    show: false,
    width: 480,
    height: 360,
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

  global.mainWindow.once('ready-to-show', async function() {
    global.mainWindow.show();

    if (await checkAppUpdate()) {
      dialog.showMessageBox(global.mainWindow, {
        type: 'none',
        noLink: true,
        message: global.i18n.__('warning_app_require_upgrade'),
        defaultId: global.isWin ? 0 : 1,
        cancelId: global.isWin ? 1 : 0,
        buttons: global.isWin ? ['OK', global.i18n.__('btn_cancel')] : [global.i18n.__('btn_cancel'), 'OK']
      }, function(response) {
        if ((global.isWin && response === 0) || (global.isMacOS && response === 1))
          shell.openExternal(global.isWin ? 'https://check.proof.show/download/windows/ProofShowCheckInstaller.exe' : 'https://check.proof.show/download/macos/ProofShowCheckInstaller.pkg');

        process.nextTick(function() {
          global.mainWindow.close();
        });
      });
    } else {
      // listen "check-acrobat" event
      ipcMain.on('check-acrobat', async function(event) {
        try {
          // check Acrobat reader status
          await acrobatReaderUtil.checkAcrobatReader();

          event.sender.send('check-acrobat-finish', true);
        } catch(err) {
          if (err.code === pfValues.errors.readerNotFound.code) {
            dialog.showMessageBox(global.mainWindow, {
              type: 'none',
              message: global.i18n.__('warning_acrobat_require_install'),
              buttons: ['OK']
            });
            event.sender.send('check-acrobat-finish', false);
          } else if (err.code === pfValues.errors.readerIsOpening.code) {
            dialog.showMessageBox(global.mainWindow, {
              type: 'none',
              message: global.i18n.__('warning_acrobat_require_close'),
              buttons: ['OK']
            });
            event.sender.send('check-acrobat-finish', false);
          } else {
            console.log(err);
            event.sender.send('check-acrobat-finish', false);
          }
        }
      });

      // listen "proc-with-tracking-number" event
      ipcMain.on('proc-with-tracking-number', async function(event, courier, trackingNum, email) {
        try {
          // get receipt information by tracking number
          var receiptInfo = await receiptRetriever.byTrackingNum(courier, nomalizeTrackingNum(courier, trackingNum), email);
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
              message: global.i18n.__('warning_acrobat_require_install'),
              buttons: ['OK']
            });
            event.sender.send('proc-finish', null);
          } else if (err.code === pfValues.errors.readerIsOpening.code) {
            dialog.showMessageBox(global.mainWindow, {
              type: 'none',
              message: global.i18n.__('warning_acrobat_require_close'),
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
              message: global.i18n.__('warning_acrobat_require_install'),
              buttons: ['OK']
            });
            event.sender.send('proc-finish', null);
          } else if (err.code === pfValues.errors.readerIsOpening.code) {
            dialog.showMessageBox(global.mainWindow, {
              type: 'none',
              message: global.i18n.__('warning_acrobat_require_close'),
              buttons: ['OK']
            });
            event.sender.send('proc-finish', null);
          } else {
            event.sender.send('proc-finish', err);
          }
        }
      });

      // listen "locale-change" event
      ipcMain.on('locale-change', async function(event, locale) {
        global.settingData.locale = locale;
        global.i18n = new i18nLang(global.settingData.locale);

        try {
          fs.writeFileSync(global.settingFilePath, JSON.stringify(global.settingData));
        } catch(err) {}
      });

      global.mainWindow.on('closed', function() {
        global.mainWindow = null;
      });
    }
  });
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
