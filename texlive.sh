#!/bin/sh -e

# This script is used for testing using Travis
# It is intended to work on their VM set up: Ubuntu 12.04 LTS
# A minimal current TL is installed adding only the packages that are
# required

# See if there is a cached version of TL available
case "$(uname -o)" in
  Msys)
    HOMEDIR="$(cygpath -m ~)"
    PLATFORM_NAME="windows"
    INSTALLER="./install-tl-windows.bat"
    TLMGR="tlmgr.bat"
    SHUF="shuf"
    ;;
  "GNU/Linux")
    HOMEDIR="$HOME"
    PLATFORM_NAME="x86_64-linux"
    INSTALLER="./install-tl"
    TLMGR="tlmgr"
    SHUF="shuf"
    ;;
  Darwin)
    HOMEDIR="$HOME"
    PLATFORM_NAME="universal-darwin"
    INSTALLER="./install-tl"
    TLMGR="tlmgr"
    SHUF="gshuf"
    brew install coreutils
    ;;
  *)
    echo "Unknown OS: $(uname -o)" >&2
    exit 1
    ;;
esac
TEXLIVE_REPOSITORY="${TEXLIVE_REPOSITORY:-$(curl -s https://zauguin.github.io/texlive-mirrors/us | "$SHUF" -n 1)}"
export PATH="$HOME/texlive/bin/$PLATFORM_NAME:$PATH"
if ! command -v texlua > /dev/null; then
  # Obtain TeX Live
  case "$(uname -o)" in
    Msys)
      curl -O "$TEXLIVE_REPOSITORY/install-tl.zip"
      unzip -q install-tl.zip
      ;;
    *)
      wget -q "$TEXLIVE_REPOSITORY/install-tl-unx.tar.gz"
      tar -xzf install-tl-unx.tar.gz
      ;;
  esac
  cd install-tl-20*

  # Install a minimal system
  sed -ire "/~/s!!$HOMEDIR!" $GITHUB_ACTION_PATH/texlive.profile
  "$INSTALLER" --repository="${TEXLIVE_REPOSITORY}" --profile="$GITHUB_ACTION_PATH/texlive.profile"

  cd ..
  rm -Rf install-tl-20*
else
  "$TLMGR" option repository "$TEXLIVE_REPOSITORY"
fi
"$TLMGR" update --self

if [ -n "$TEXLIVE_PACKAGE_LIST_FILE" ]
then cat "$TEXLIVE_PACKAGE_LIST_FILE"
else echo "$TEXLIVE_PACKAGE_LIST"
fi | sed -re '/^#/d' | xargs "$TLMGR" install

# Keep no backups (not required, simply makes cache bigger)
"$TLMGR" option -- autobackup 0

# Update the TL install but add nothing new
"$TLMGR" update --self --all --no-auto-install
