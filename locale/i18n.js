const path = require("path");
const electron = require('electron');
const fs = require('fs');

let loadedLanguage;
let app = electron.app ? electron.app : electron.remote.app;

/**
 * Load locale file
 * @param {string} locale the locale string
 */
function i18n(locale) {
  if (fs.existsSync(path.join(__dirname, locale + '.js'))) {
    loadedLanguage = JSON.parse(fs.readFileSync(path.join(__dirname, locale + '.js'), 'utf8'));
  } else {
    loadedLanguage = JSON.parse(fs.readFileSync(path.join(__dirname, 'en.js'), 'utf8'));
  }
}


/**
 * Get locale text
 * @param {string} phrase the constant value for the phrase
 * @return {string} the locale text
 */
i18n.prototype.__ = function(phrase) {
  let translation = loadedLanguage[phrase];

  if (translation === undefined) {
    translation = phrase;
  }
  return translation;
};

module.exports = i18n;
