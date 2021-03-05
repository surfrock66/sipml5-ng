#!/bin/bash

java \
-cp . \
-Djsdoc.dir=./jsdoc-toolkit \
-jar ./jsdoc-toolkit/jsrun.jar \
./jsdoc-toolkit/app/run.js \
-t=./jsdoc-toolkit/templates/jsdoc \
-r=4 \
./SIPml.js \
-d=docgen \
-D="title:SIPml5-NG Library" \
-D="index:files"

cp docgen.index.html docgen/index.html

#sed -i.tmp 's/="assets/="..\/assets/g' docgen/index.html
#sed -i.tmp 's/="docgen\//="/g' docgen/index.html
#sed -i.tmp 's/="images/="..\/images/g' docgen/index.html

rm -f docgen/index.html.tmp

sed -i.tmp 's/Namespace /AnonymousClass /g' docgen/symbols/SIPml.Session.Configuration.html

rm -f docgen/symbols/SIPml.Session.Configuration.html.tmp

sed -i.tmp 's/Namespace /AnonymousClass /g' docgen/symbols/SIPml.Stack.Configuration.html

rm -f docgen/symbols/SIPml.Stack.Configuration.html.tmp
