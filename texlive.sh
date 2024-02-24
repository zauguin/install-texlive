#!/bin/sh -e

# This script is used for testing using Travis
# It is intended to work on their VM set up: Ubuntu 12.04 LTS
# A minimal current TL is installed adding only the packages that are
# required

# See if there is a cached version of TL available
TEXLIVE_REPOSITORY="${TEXLIVE_REPOSITORY:-$(curl -s https://zauguin.github.io/texlive-mirrors/us | shuf -n 1)}"
case "$(uname -o)" in
  Msys)
    HOMEDIR="$(cygpath -m ~)"
    PLATFORM_NAME="windows"
    INSTALLER="./install-tl-windows.bat"
    ;;
  "GNU/Linux")
    HOMEDIR="$HOME"
    PLATFORM_NAME="x86_64-linux"
    INSTALLER="./install-tl"
    ;;
  *)
    echo "Unknown OS: $(uname -o)" >&2
    exit 1
    ;;
esac
export PATH="$HOME/texlive/bin/$PLATFORM_NAME:$PATH"
echo "Searching TeX Live"
if ! command -v texlua > /dev/null; then
  echo "Installing TeX Live"
  # Obtain TeX Live
  case "$(uname -o)" in
    Msys)
      curl -O "$TEXLIVE_REPOSITORY/install-tl.zip"
      unzip install-tl.zip
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
  echo "Found TeX Live"
  tlmgr option repository "$TEXLIVE_REPOSITORY"
fi
echo "Using PATH: $PATH"
ls "$HOME/texlive/bin/$PLATFORM_NAME"
tlmgr update --self

if [ -n "$TEXLIVE_PACKAGE_LIST_FILE" ]
then cat "$TEXLIVE_PACKAGE_LIST_FILE"
else echo "$TEXLIVE_PACKAGE_LIST"
fi | sed -re '/^#/d' | xargs tlmgr install

# Keep no backups (not required, simply makes cache bigger)
tlmgr option -- autobackup 0

# Update the TL install but add nothing new
tlmgr update --self --all --no-auto-install
