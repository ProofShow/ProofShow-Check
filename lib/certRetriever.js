'use strict';
const corePdfManager = require('pdfjs-dist/lib/core/pdf_manager.js');
const coreprimitives = require('pdfjs-dist/lib/core/primitives.js');
const coreStream = require('pdfjs-dist/lib/core/stream.js');
const asn1js = require("asn1js");
const pkijs = require('pkijs');
const pfValues = require('./proofshowValues');

/**
 *  Convert a node buffer to ArrayBuffer
 *  @param {Object} nodeBuffer the node buffer
 *  @return {Object} the ArrayBuffer
 */
function _toArrayBuffer(nodeBuffer) {
   return nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
}

/**
 *  Format the one line base64 with PEM rule
 * @param {string} b64Str the one line base64 string
 * @return {string} the formatted base64 string with PEM rule
 */
function _formatPEMB64(b64Str) {
	var stringLength = b64Str.length;
	var resultString = "";

	for (var i = 0, count = 0; i < stringLength; i++, count++) {
		if (count > 63) {
			resultString = `${resultString}\r\n`;
			count = 0;
		}

		resultString = `${resultString}${b64Str[i]}`;
	}

	return resultString;
}

/**
 *  Parse certificate from a PDF file buffer
 *  @param {Object} pdfBuffer the PDF file buffer
 *  @return {Object} the list of certificate in PDF
 */
function _getCerts(pdfBuffer) {
  try {
    var tmpPdfMgr = new corePdfManager.LocalPdfManager('dummy', pdfBuffer, '', {}, '');

    tmpPdfMgr.pdfDocument.parseStartXRef();
    tmpPdfMgr.pdfDocument.parse();

    var xref = tmpPdfMgr.pdfDocument.xref;
    var trailer = xref.trailer;
    var certList = [];

    // iterate PDF objects
    trailer.xref.entries.forEach(function(entry, idx) {
      if (entry.free != true) {
        let ref = new coreprimitives.Ref(idx, entry.gen);
        let fetchedObj = xref.fetch(ref);

        // parser sig field
        if (coreprimitives.isDict(fetchedObj) && fetchedObj._map && fetchedObj._map.Type) {
          if (fetchedObj._map.Type.name === 'Sig' && fetchedObj._map.SubFilter.name === 'ETSI.CAdES.detached') {
            // read cms binary data
            let byteRange = fetchedObj._map.ByteRange;
            let cmsHex = pdfBuffer.slice(byteRange[0] + byteRange[1], byteRange[2]).toString();
            let cmsBuffer = Buffer.from(cmsHex.replace(/</g, '').replace(/>/g, ''), 'hex');

            // parse cms binary data
            let asn1 = asn1js.fromBER(_toArrayBuffer(cmsBuffer));
            let cmsContentInfo = new pkijs.ContentInfo({ schema: asn1.result });
            let cmsSignedData = new pkijs.SignedData({schema: cmsContentInfo.content});

            // extract signer's serial number
            let signerSerialNum = cmsSignedData.signerInfos[0].sid.serialNumber;

            // iterate certificates in cms
            cmsSignedData.certificates.forEach(function(cert) {
              // find signer's certificate
              if (signerSerialNum.valueBlock.toString() === cert.serialNumber.valueBlock.toString()) {
                let certPEM = '';

                // format certificate to PEM format
                certPEM += '-----BEGIN CERTIFICATE-----\r\n';
                certPEM += _formatPEMB64(Buffer.from(cert.toSchema(true).toBER(false)).toString('base64'));
                certPEM += '\r\n-----END CERTIFICATE-----\r\n';

                certList.push(certPEM);
              }
            });
          }
        }
      }
    });

    return certList;
  } catch (err) {
    throw pfValues.errors.failParseCert;
  }
}

module.exports.getCerts = _getCerts;
