#!/bin/bash

root=$(dirname $0)
dir=$(pwd)
url_file="${root}/url.txt"
from="1"
to="1000"

if [ ! -z "$1" ]; then
    dir=$1
fi
if [ ! -z "$2" ]; then
    from=$2
fi
if [ ! -z "$3" ]; then
    to=$3
fi

echo "Downloading data from ${from} to ${to} and saved to ${dir}"

sed -n "${from},${to}p" $url_file | wget -c --input-file=- --no-verbose --show-progress --directory-prefix="${dir}"


