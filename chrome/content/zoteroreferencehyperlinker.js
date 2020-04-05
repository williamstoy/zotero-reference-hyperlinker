// zoteroreferencehyperlinker.js

// See https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules.
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm");

Zotero.ReferenceHyperlinker = new function() {

	this.openPreferenceWindow = function(paneID, action) {
		var io = {pane: paneID, action: action};
		window.openDialog(
				'chrome://zoteroreferencehyperlinker/content/preferences.xul',
				'zoteroreferencehyperlinker-preferences-windowname',
				'chrome,titlebar,toolbar,centerscreen' + Zotero.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal', io
		);
	};
	
	// disable or enable the nested option to overwrite PDF
	this.updatePDFOverwritePref = function () {
		setTimeout(() => {
			document.getElementById('checkbox-zoteroreferencehyperlinker-overwrite-pdf').disabled = !document.getElementById('checkbox-zoteroreferencehyperlinker-output-pdf').checked;
		});
	};

	this.recognize = Zotero.Promise.coroutine(function* () {

		// Look for the tesseract executable in the settings and at commonly used locations.
		// If it is found, the settings are updated.
		// Otherwise abort with an alert.
		let ocrEngine = Zotero.Prefs.get("zoteroreferencehyperlinker.grobidPath");
		let port = Zotero.Prefs.get("zoteroreferencehyperlinker.port");
		let overwritePDF = Zotero.Prefs.get("zoteroreferencehyperlinker.overwritePDF");
		
		// check to see if the server is running

		let items = Zotero.getActiveZoteroPane().getSelectedItems();
		for (let item of items) {
			// find the PDF
			let pdfItem;
			if (item.isAttachment()) {
				if (item.isFileAttachment() && item.attachmentContentType == 'application/pdf') {
					pdfItem = item;
					item = Zotero.Items.get(item.parentItemID);
				}
				else {
					alert("Item is attachment but not PDF and will be ignored.");
					continue;
				}
			}
			else {
				let pdfAttachments = item.getAttachments(false)
					.map(itemID => Zotero.Items.get(itemID))
					.filter(att => att.isFileAttachment() && att.attachmentContentType == 'application/pdf');
				if (pdfAttachments.length == 0) {
					alert("No PDF found for the selected item.");
					continue;
				}
				if (pdfAttachments.length > 1) {
					alert("There are several PDFs attached to this item. Only the first one will be processed.");
				}
				pdfItem = pdfAttachments[0];
			}
			let pdf = pdfItem.getFilePath();
			let base = pdf.replace(/\.pdf$/, '');
			let dir = OS.Path.dirname(pdf);
			let infofile = base + '.info.txt';
			let hyperlinkedbase = Zotero.Prefs.get("zoteroreferencehyperlinker.overwritePDF") ? base : base + '.hyperlinked';
			// TODO filter out PDFs which have already a text layer

			alert(pdf);
			/*
			// extract images from PDF
			let imageList = OS.Path.join(dir, 'image-list.txt');
			if (!(yield OS.File.exists(imageList))) {
				try {
					Zotero.debug("Running " + pdfinfo + ' ' + pdf + ' ' + infofile);
					yield Zotero.Utilities.Internal.exec(pdfinfo, [pdf, infofile]);
					Zotero.debug("Running " + pdftoppm + ' -png -r 300 ' + pdf + ' ' + dir + '/page');
					yield Zotero.Utilities.Internal.exec(pdftoppm, ['-png', '-r', 300, pdf, dir + '/page']);
				}
				catch (e) {
					Zotero.logError(e);
				}
				// save the list of images in a separate file
				let info = yield Zotero.File.getContentsAsync(infofile);
				let numPages = info.match('Pages:[^0-9]+([0-9]+)')[1];
				var imageListArray = [];
				for (let i = 1; i <= parseInt(numPages, 10); i++) {
					let paddedIndex = "0".repeat(numPages.length) + i;
					imageListArray.push(dir + '/page-' + paddedIndex.substr(-numPages.length) + '.png');
				}
				Zotero.File.putContents(Zotero.File.pathToFile(imageList), imageListArray.join('\n'));
			}

			let parameters = [dir + '/image-list.txt'];
			let requestedFormats = [];
			parameters.push(hyperlinkedbase);
			if (Zotero.Prefs.get("zoteroreferencehyperlinker.language")) {
				parameters.push('-l');
				parameters.push(Zotero.Prefs.get("zoteroreferencehyperlinker.language"));
			}
			parameters.push('txt');
			if (Zotero.Prefs.get("zoteroreferencehyperlinker.outputPDF")) {
				parameters.push('pdf');
				requestedFormats.push('pdf');
			}
			if (Zotero.Prefs.get("zoteroreferencehyperlinker.outputHocr")) {
				parameters.push('hocr');
				requestedFormats.push('hocr');
			}
			try {
				Zotero.debug("Running " + ocrEngine + ' ' + parameters.join(' '));
				yield Zotero.Utilities.Internal.exec(ocrEngine, parameters);
			}
			catch (e) {
				Zotero.logError(e);
			}

			if (Zotero.Prefs.get("zoteroreferencehyperlinker.outputNote")) {
				let contents = yield Zotero.File.getContentsAsync(hyperlinkedbase + '.txt');
				let newNote = new Zotero.Item('note');
				newNote.setNote(contents);
				newNote.parentID = item.id;
				yield newNote.saveTx();
			}

			// create attachments with link to output formats
			for (let format of requestedFormats) {
				yield Zotero.Attachments.linkFromFile({
					file: hyperlinkedbase + '.' + format,
					parentItemID: item.id
				});
			}
			
			if (!Zotero.Prefs.get("zoteroreferencehyperlinker.outputPNG") && imageListArray) {
				// delete image list
				yield Zotero.File.removeIfExists(imageList);
				// delete PNGs
				for (let imageName of imageListArray) {
					yield Zotero.File.removeIfExists(imageName);
				}
			}
			*/
		}
	});

};
