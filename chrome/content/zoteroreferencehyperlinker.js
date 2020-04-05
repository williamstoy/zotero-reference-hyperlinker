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
		let grobidPath = Zotero.Prefs.get("zoteroreferencehyperlinker.grobidPath");
		let port = 8070; //Zotero.Prefs.get("zoteroreferencehyperlinker.port");
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
			let hyperlinkedbase = Zotero.Prefs.get("zoteroreferencehyperlinker.overwritePDF") ? base : base + '.hyperlinked.pdf';
			// TODO filter out PDFs which have already a text layer

			// check to make sure the local server is running
			const request = new XMLHttpRequest();
			request.open("GET", 'http://127.0.0.1:' + port + '/api/isalive');

			request.onreadystatechange = function(e) {
				if(this.readyState==4) {
					if(this.status==200) {
						let pdf = '/Users/williamstoy/Zotero/storage/FFFXTAID/Dan and Poo - 2004 - Spike Timing-Dependent Plasticity of Neural Circui.pdf';
						let contents = Zotero.File.getContentsAsync(pdf);

						alert(typeof contents);
					} else {
						alert('The GROBID server is not currently running');
					}
				}
			}

			request.send();
		}
	});

};
