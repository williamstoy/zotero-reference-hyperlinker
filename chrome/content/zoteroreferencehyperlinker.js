// zoteroreferencehyperlinker.js

// See https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules.
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm");

Zotero.ReferenceHyperlinker = new function() {

	this.init = function() {
		// try to start the grobid server if it is not running
		// check if the grobid server is running
		// if it is not running, try to start it
		Zotero.ReferenceHyperlinker.startGROBID();

		// Register the callback in Zotero as an item observer
		var notifierID = Zotero.Notifier.registerObserver(Zotero.ReferenceHyperlinker.notifierCallback, ['item']);

		// Unregister callback when the window closes (important to avoid a memory leak)
		window.addEventListener('unload', function(e) {
				Zotero.Notifier.unregisterObserver(notifierID);
		}, false);
	};

	this.startGROBID = async function() {
		let grobidPath = Zotero.Prefs.get("zoteroreferencehyperlinker.grobidPath");

		if (!grobidPath) {
			alert('No GROBID installation path was specified. Please update Zotero Reference Hyperlinker Settings.');
			return;
		}

		// check that the startgrobid script is there
		let execdir = FileUtils.getDir('GreBinD', []);
		let startgradlewserver = execdir.clone();
		startgradlewserver.append("startgradlewserver.sh");
		startgradlewserver = startgradlewserver.path;
		if (!OS.File.exists(startgradlewserver)) {
			alert("No " + startgradlewserver + " shell script found. Please run \"./install.sh\" in your /zotero-reference-hyperlinker folder");
			return;
		}

		// try to start the GROBID service
		Zotero.Utilities.Internal.exec(startgradlewserver, [grobidPath]);
		return;
	};

	this.startGROBIDifnotstarted = async function() {
		if(!(await Zotero.ReferenceHyperlinker.checkIfGROBIDrunning())) { // function does not exist yet
			Zotero.ReferenceHyperlinker.startGROBID();
		}
	};

	this.notifierCallback = {
		// Hyperlink pdfs when new item is added to zotero.
		notify: function(event, type, ids, extraData) {
			automatic_pdf_hyperlinker_bool = Zotero.Prefs.get('zoteroreferencehyperlinker.automaticHyperlinker');
			if(event == "add" && automatic_pdf_hyperlinker_bool !== undefined && automatic_pdf_hyperlinker_bool == true) {
				suppress_warnings = true;
				Zotero.ReferenceHyperlinker.updateItems(Zotero.Items.get(ids), suppress_warnings);
			}
		}
	};

	this.updateItems = function(items, suppress_warnings) {
		// If we don't have any items to update, just return.
		if (items.length == 0 ||
				Zotero.ReferenceHyperlinker.numberOfUpdatedItems < Zotero.ReferenceHyperlinker.toUpdate) {
				return;
		}

		// Reset our state and figure out how many items we have to update.
		Zotero.ReferenceHyperlinker.resetState();
		Zotero.ReferenceHyperlinker.toUpdate = items.length;
		Zotero.ReferenceHyperlinker.itemsToUpdate = items;
		// Iterate through our items, updating each one with a pdf.
		Zotero.ReferenceHyperlinker.updateNextItem(suppress_warnings);
	};

	this.resetState = function() {
		// Reset state for updating items.
		Zotero.ReferenceHyperlinker.current = -1;
		Zotero.ReferenceHyperlinker.toUpdate = 0;
		Zotero.ReferenceHyperlinker.itemsToUpdate = null;
		Zotero.ReferenceHyperlinker.numberOfUpdatedItems = 0;
	};

	this.updateNextItem = function(suppress_warnings) {
		Zotero.ReferenceHyperlinker.numberOfUpdatedItems++;

		// If we have updated all of our items, reset our state and return.
		if (Zotero.ReferenceHyperlinker.current == Zotero.ReferenceHyperlinker.toUpdate - 1) {
				Zotero.ReferenceHyperlinker.resetState();
				return;
		}

		// Update a single item with a pdf.
		Zotero.ReferenceHyperlinker.current++;
		Zotero.ReferenceHyperlinker.updateItem(
						Zotero.ReferenceHyperlinker.itemsToUpdate[Zotero.ReferenceHyperlinker.current],
						suppress_warnings
		);
	};

	this.updateItem = function(item, suppress_warnings) {
		//alert('Reference Hyperlinker: beginning item update');

		// Look for the tesseract executable in the settings and at commonly used locations.
		// If it is found, the settings are updated.
		// Otherwise abort with an alert.	
		let port = Zotero.Prefs.get("zoteroreferencehyperlinker.port");

		if (!port) {
			alert('No GROBID server port specified. Please update Zotero Reference Hyperlinker Settings.');
			return;
		}

		let overwritePDF = Zotero.Prefs.get("zoteroreferencehyperlinker.overwritePDF");

		// find the PDF
		let pdfItem;
		if (item.isAttachment()) {
			if (item.isFileAttachment() && item.attachmentContentType == 'application/pdf') { // and the item does not have a tag _hyperlinked
				pdfItem = item;
				item = Zotero.Items.get(item.parentItemID);
			}
			else {
				Zotero.debug("Item is attachment but not PDF and will be ignored.");
				return;
			}
		} else {
			let pdfAttachments = item.getAttachments(false)
				.map(itemID => Zotero.Items.get(itemID))
				.filter(att => att.isFileAttachment() && att.attachmentContentType == 'application/pdf');
			if (pdfAttachments.length == 0) {
				Zotero.debug("No PDF found for the selected item.");
				return;
			}
			if (pdfAttachments.length > 1) {
				Zotero.debug("There are several PDFs attached to this item. Only the first one will be processed.");
			}
			pdfItem = pdfAttachments[0];
		}

		// check if the parent item already has a _hyperlinked tag
		if (item.hasTag('_hyperlinked')) {
			Zotero.debug('has _hyperlinked tag already, stopping');
			return;
		}

		let pdf = pdfItem.getFilePath();
		let base = pdf.replace(/\.pdf$/, '');
		let dir = OS.Path.dirname(pdf);
		let hyperlinkedbase = Zotero.Prefs.get("zoteroreferencehyperlinker.overwritePDF") ? base : base + '.hyperlinked.pdf';
		
		// Look for the shell script
		// Abort with an alert if it is not found.
		// See https://developer.mozilla.org/en-US/docs/Archive/Add-ons/Code_snippets/File_I_O#Getting_special_files
		// and https://dxr.mozilla.org/mozilla-central/source/xpcom/io/nsDirectoryServiceDefs.h.
		let execdir = FileUtils.getDir('GreBinD', []);
		let annotatepdf = execdir.clone();
		annotatepdf.append("annotatepdf.sh");
		annotatepdf = annotatepdf.path;
		if (!OS.File.exists(annotatepdf)) {
			alert("No " + annotatepdf + " shell script found.");
			return;
		}
		
		// check to make sure the local server is running
		const request = new XMLHttpRequest();
		request.open("GET", 'http://127.0.0.1:' + port + '/api/isalive');
		request.onreadystatechange = function(e) {
			if(this.readyState==4) {
				if(this.status==200) {					// if the server responds with an alive message, process the file
					Zotero.debug("Reference Hyperlinker: Received alive message from server");
					Zotero.Utilities.Internal.exec(annotatepdf, [pdf, hyperlinkedbase, port]).then(function onFulfill() {
						Zotero.debug("Reference Hyperlinker: completed pdf annotation");
						Zotero.Attachments.linkFromFile({
							file: hyperlinkedbase,
							parentItemID: item.id
						});
						item.addTag('_hyperlinked'); // add the hyperlinked tag so we know to ignore it in the future
						item.saveTx();
					});
				} else {
					Zotero.ReferenceHyperlinker.startGROBID(); // try to restart the grobid service
					alert('The GROBID server is not currently running. Please try again in 10 seconds');
				}
			}
		};
		Zotero.debug("Reference Hyperlinker: Sending request to server");
		request.send();
	};

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
		Zotero.debug("Reference Hyperlinker: Recognized");

		let items = Zotero.getActiveZoteroPane().getSelectedItems();
		for (let item of items) {
			Zotero.ReferenceHyperlinker.updateItem(item, true);
		}
	});

};
window.addEventListener('load', function(e) {
  Zotero.ReferenceHyperlinker.init();
}, false);