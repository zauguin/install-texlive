#!/bin/sh -e

# This script is used for testing using Travis
# It is intended to work on their VM set up: Ubuntu 12.04 LTS
# A minimal current TL is installed adding only the packages that are
# required

# See if there is a cached version of TL available
TEXLIVE_REPOSITORY="${TEXLIVE_REPOSITORY:-$(curl -s https://zauguin.github.io/texlive-mirrors/us | shuf -n 1)}"
export PATH="$HOME/texlive/bin/x86_64-linux:$PATH"
if ! command -v texlua > /dev/null; then
  # Obtain TeX Live
  case "$(uname -o)" in
    Msys)
      curl -sO "$TEXLIVE_REPOSITORY/install-tl.zip"
      unzip install-tl.zip
      HOMEDIR="$(cygpath -m ~)"
      ;;
    *)
      HOMEDIR="$HOME"
      wget -q "$TEXLIVE_REPOSITORY/install-tl-unx.tar.gz"
      tar -xzf install-tl-unx.tar.gz
      ;;
  esac
  cd install-tl-20*

  # Install a minimal system
  sed -ire "/~/s!!$HOMEDIR!" $GITHUB_ACTION_PATH/texlive.profile
  ./install-tl --repository="${TEXLIVE_REPOSITORY}" --profile="$GITHUB_ACTION_PATH/texlive.profile"

  cd ..
  rm -Rf install-tl-20*
else
  tlmgr option repository "$TEXLIVE_REPOSITORY"
fi
tlmgr update --self

if [ -n "$TEXLIVE_PACKAGE_LIST_FILE" ]
then cat "$TEXLIVE_PACKAGE_LIST_FILE"
else echo "$TEXLIVE_PACKAGE_LIST"
fi | sed -re '/^#/d' | xargs tlmgr install

# Keep no backups (not required, simply makes cache bigger)
tlmgr option -- autobackup 0

# Update the TL install but add nothing new
tlmgr update --self --all --no-auto-install
