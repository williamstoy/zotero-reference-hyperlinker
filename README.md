# Zotero Reference Hyperlinker

This Zotero plugin adds the functionality to overlay references within PDFs with hyperlinks to the referenced article's DOI.

## Prerequisites

- GROBID is installed and running https://github.com/kermitt2/grobid 

## Installation

To install the extension:

* Download the XPI file of the [latest release](https://github.com/williamstoy/zotero-reference-hyperlinker/releases).
* In Zotero, go to Tools → Add-ons and drag the .xpi onto the Add-ons window.
* Possibly, adjust the path to Tesseract in the add-on options.


## Build and release

Run `build.sh` script, which creates a new `.xpi` file.

For a new release, run the script `release.sh`, push the code changes, publish a [new release on GitHub](https://github.com/williamstoy/zotero-reference-hyperlinker/releases/new) and attach the `.xpi` file there.


## License

The source code is released under [GNU Affero General Public License v3](LICENSE).
