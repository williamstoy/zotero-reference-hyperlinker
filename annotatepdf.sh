#!/bin/sh

inputpdf="$1"
outputpdf="$2"
port="$3"

curl --location --request POST "localhost:${port}/api/annotatePDF" \
--form "input=@${inputpdf}" \
--form "consolidateCitations=2" \
--header 'Content-Type: multipart/form-data' \
--output "${outputpdf}"
