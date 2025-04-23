#!/bin/bash

sync_dirs=('.vscode' 'patches' 'components' 'composables' 'globals' 'lib')
down_dirs=("${sync_dirs[@]}")
skip_files=('index.vue' 'Home.vue')
top_files=('.eslintrc.cjs' 'tsconfig.app.json' 'tsconfig.json' 'tsconfig.node.json' 'vite.config.js' 'src/main.js' 'src/vite-env.d.ts')
working_dir="$PWD/template"
lib_dir="$PWD/tmp/template"

function get_repo() {
  rm -rf tmp
  while true; do timeout 15 gh repo clone xnscu/create tmp -- --depth=1 && break; done
}

function main() {
  if [[ ${1:-download} == download ]]; then
    get_repo
    src_dir="$lib_dir"
    dest_dir="$working_dir"
    echo "sync from $src_dir to $dest_dir"
    for tf in "${top_files[@]}"; do
      cp -rf "$src_dir/$tf" "$dest_dir/$tf"
      echo "复制$src_dir/$tf到$dest_dir/$tf"
    done
    for dir in "${down_dirs[@]}"; do
      echo "处理 $dir"
      if [ ! -d $dest_dir/$dir ]; then
        mkdir -p $dest_dir/$dir
        echo "$dest_dir/$dir 不存在,创建"
      fi
      for file in $src_dir/$dir/*; do
        fn="$(basename $file)"
        skip=0
        for sfn in "${skip_files[@]}"; do
          if [[ $fn == $sfn ]]; then
            skip=1
            break
          fi
        done
        if [[ $skip == 1 ]]; then
          continue
        fi
        cp -rf "$file" "$dest_dir/$dir"
        echo "复制$file到$dest_dir/$dir"
      done
    done
    rm -rf tmp
  elif [[ $1 == "preview" ]]; then
    get_repo
    src_dir="$working_dir"
    dest_dir="$lib_dir"
    echo "sync from $src_dir to $dest_dir"
    for tf in "${top_files[@]}"; do
      cp -rf "$src_dir/$tf" "$dest_dir/$tf"
      echo "复制$src_dir/$tf到$dest_dir/$tf"
    done
    for dir in "${xodel_dirs[@]}"; do
      echo "处理 $dir"
      for file in $src_dir/$dir/*; do
        fn="$(basename $file)"
        lib_file="$dest_dir/$dir/$fn"
        skip=0
        for sfn in "${skip_files[@]}"; do
          if [[ $fn == $sfn ]]; then
            skip=1
            break
          fi
        done
        if [[ $skip == 1 ]]; then
          continue
        fi
        if [ -f "$lib_file" ]; then
          cp -rf "$file" "$dest_dir/$dir"
          echo "复制$file到$dest_dir/$dir"
        fi
      done
    done
    for dir in "${sync_dirs[@]}"; do
      echo "处理 $dir"
      for file in $src_dir/$dir/*; do
        fn="$(basename $file)"
        skip=0
        for sfn in "${skip_files[@]}"; do
          if [[ $fn == $sfn ]]; then
            skip=1
            break
          fi
        done
        if [[ $skip == 1 ]]; then
          continue
        fi
        cp -rf "$file" "$dest_dir/$dir"
        echo "复制$file到$dest_dir/$dir"
      done
    done
    code tmp
  else
    echo "invalid argument: $1"
  fi
}

main $1