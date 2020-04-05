#!/bin/sh

version="$1"
if [ -z "$version" ]; then
	read -p "Enter new version number: " version
fi


rm -f zotero-reference-hyperlinker-${version}.xpi
zip -r zotero-reference-hyperlinker-${version}.xpi chrome/* defaults/* chrome.manifest install.rdf
