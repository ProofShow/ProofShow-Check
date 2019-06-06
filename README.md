## ProofShow Check
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Known Vulnerabilities](https://snyk.io/test/github/ProofShow/ProofShowCheck/badge.svg?targetFile=package.json)](https://snyk.io/test/github/ProofShow/ProofShowCheck?targetFile=package.json)
[![Build Status](https://travis-ci.com/ProofShow/ProofShowCheck.svg?branch=master)](https://travis-ci.com/ProofShow/ProofShowCheck)

ProofShow Check is a desktop application for checking the validity of ProofShow return receipt. The features of ProofShow Check are:

- Checking return receipt with a `receiptID`
- Checking local return receipt file
- Integrate with [PCCA Verifier](https://github.com/ProofShow/PCCAVerifier) to verify the signer's certificate


### Requirement
- Node.js v10.x.x

### How to build
##### On Windows
```
npm install
npm run dist-win
```
>Then find `ProofShow Check Installer-[ver].exe` in the `release` directory.

##### On MacOS
```
npm install
npm run dist-mac
```
>Then find `ProofShow Check Installer-[ver].pkg` in the `release` directory.

### License
AGPL-3.0-or-later