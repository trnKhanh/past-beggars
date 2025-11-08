#!/bin/bash

work_dir=$(pwd)

eval "$(conda shell.bash hook)"
conda activate AIC25

st=25
i=1
while IFS= read -r file; do
    if (( i < st )); then
        ((i++))
        continue
    fi

    echo "$i: $file"

    cd $work_dir
    pwd
    bash script/download_data.sh data/zip $i $i

    cd $work_dir/data
    pwd
    7z x $work_dir/data/zip/$file -y
    rm $work_dir/data/zip/$file


    ((i++))
done < $work_dir/files.txt

cd $work_dir/tmp/workspace
pwd
aic51-cli add $work_dir/data/video -d -mCo
