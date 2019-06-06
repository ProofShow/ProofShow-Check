'use strict';

module.exports.errors = {
  'success': {code: 0, msg: 'success'},
  'failDownload': {code: 1, msg: 'failed to download receipt by ID'},
  'failParseCert': {code: 2, msg: 'failed to parse certificate from PDF'},
  'invalidNumCert': {code: 3, msg: 'invalid number of certificates in PDF'},
  'failVerifyCert': {code: 4, msg: 'failed to verify certiciate'},
  'readerNotFound': {code: 5, msg: 'can not find acrobat reader'},
  'readerIsOpening': {code: 6, msg: 'acrobat reader is opening'},
  'failAddTrust': {code: 7, msg: 'failed to add certificate to acrobat trust'}
};
