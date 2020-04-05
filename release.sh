#!/bin/sh

read -p "Enter new version number: " version


##############
## Update install.rdf
##############

perl -pi -e "s/em:version=\"[^\"]*/em:version=\"$version/;" "install.rdf"
rm "install.rdf.bak"
git add "install.rdf"


##############
## Update update.rdf
##############

perl -pi -e "s/<em:version>[^<]*/<em:version>$version/;" \
          -e "s/<em:updateLink>[^<]*/<em:updateLink>https:\/\/github.com\/williamstoy\/zotero-reference-hyperlinker\/releases\/download\/$version\/zotero-reference-hyperlinker-$version.xpi/;" \
          -e "s/<em:updateInfoURL>[^<]*/<em:updateInfoURL>https:\/\/github.com\/williamstoy\/zotero-reference-hyperlinker\/releases\/tag\/$version/;" \
    update.rdf
git add "update.rdf"
rm "update.rdf.bak"


git commit -m "Release $version" 1>&2


./build.sh "$version"
