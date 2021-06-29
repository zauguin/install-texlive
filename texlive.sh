#!/bin/sh -e

# This script is used for testing using Travis
# It is intended to work on their VM set up: Ubuntu 12.04 LTS
# A minimal current TL is installed adding only the packages that are
# required

# See if there is a cached version of TL available
export PATH=$HOME/texlive/bin/x86_64-linux:$PATH
echo "$HOME/texlive/bin/x86_64-linux" >> $GITHUB_PATH
if ! command -v texlua > /dev/null; then
  # Obtain TeX Live
  wget http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz
  tar -xzf install-tl-unx.tar.gz
  cd install-tl-20*

  # Install a minimal system
  sed -ire "/~/s!!$HOME!" $GITHUB_ACTION_PATH/texlive.profile
  ./install-tl --profile=$GITHUB_ACTION_PATH/texlive.profile

  cd ..
  rm -Rf install-tl-20*
fi
tlmgr update --self

echo "$TEXLIVE_PACKAGE_LIST" | sed -re '/^#/d' | xargs tlmgr install

# Keep no backups (not required, simply makes cache bigger)
tlmgr option -- autobackup 0

# Update the TL install but add nothing new
tlmgr update --self --all --no-auto-install
