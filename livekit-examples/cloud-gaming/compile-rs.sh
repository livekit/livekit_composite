#!/bin/bash
set -euxo pipefail

for repo in gst-plugins-rs; do
  pushd $repo

  # strip binaries in debug mode
  mv Cargo.toml Cargo.toml.old
  sed s,'\[profile.release\]','[profile.release]\nstrip="debuginfo"', Cargo.toml.old > Cargo.toml 

  opts="-D prefix=/usr -D tests=disabled -D doc=disabled -D webrtc=enabled -D rtp=enabled"

  if [[ $DEBUG == 'true' ]]; then
    if [[ $OPTIMIZATIONS == 'true' ]]; then
      opts="$opts -D buildtype=debugoptimized"
    else
      opts="$opts -D buildtype=debug"
    fi
  else
    opts="$opts -D buildtype=release -D b_lto=true"
  fi

  meson build $opts

  # This is needed for other plugins to be built properly
  ninja -C build install
  # This is where we'll grab build artifacts from
  DESTDIR=/compiled-binaries ninja -C build install
  popd
done

