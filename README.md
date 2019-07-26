## ProofShow Check
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Known Vulnerabilities](https://snyk.io//test/github/ProofShow/ProofShow-Check/badge.svg?targetFile=package.json)](https://snyk.io//test/github/ProofShow/ProofShow-Check?targetFile=package.json)
[![Build Status](https://travis-ci.com/ProofShow/ProofShow-Check.svg?branch=master)](https://travis-ci.com/ProofShow/ProofShow-Check)

ProofShow Check is a desktop app for courier companies and their customers to check the validity of the digital return receipts signed with ProofShow Ack mobile app. Specifically, ProofShow Check, once launched, will do the following:
- Ask for the unique `receiptID` of a return receipt;
- Use `receiptID` to download the return receipt;
- Retrieve the PCCA certificate within the return receipt;
- Check the validity of the PCCA certificate using [PCCA Verifier](https://github.com/ProofShow/PCCAVerifier);
- Let Acrobat Reader trust the PCCA certificate if it is valid;
- Use Acrobat Reader to open and verify the return receipt.

ProofShow Check is based on [Electron](https://electronjs.org/), and is available on Windows and macOS.


### Requirement
- Node.js v10.x.x

### How to build
##### On Windows
To build ProofShow Check on Windows, run the following:
```
npm install
npm run dist-win
```
Then find `ProofShow Check Installer-[ver].exe` in the `release` directory.

##### On macOS
To build ProofShow Check on macOS, run the following:
```
npm install
npm run dist-mac
```
Then find `ProofShow Check Installer-[ver].pkg` in the `release` directory.

### License
AGPL-3.0-or-later
