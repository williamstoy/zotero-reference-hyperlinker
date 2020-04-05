
//let pdf = '/Users/williamstoy/Zotero/storage/FFFXTAID/Dan and Poo - 2004 - Spike Timing-Dependent Plasticity of Neural Circui.pdf'//
// get the pdf from the local filesystem
const pdf_request = new XMLHttpRequest();
pdf_request.open("GET", 'file://' + pdf);

pdf_request.onreadystatechange = function(e) {
    if(this.readyState==4 && this.status==200) {
        sendAnnotationRequest(pdf_request.responseText);
    }
}

pdf_request.send();


function sendAnnotationRequest(fileBlob) {
    var data = new FormData();
    data.append("consolidateCitations", "1");
    data.append("input", fileBlob, "file");
     
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function() {
      if(this.readyState === 4) {
        console.log(this.responseText);
      }
    });

    xhr.open("POST", "http://127.0.0.1:" + port + "/api/annotatePDF");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    xhr.send(data);
}

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
    Zotero.debug("Running " + grobidPath + ' ' + parameters.join(' '));
    yield Zotero.Utilities.Internal.exec(grobidPath, parameters);
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