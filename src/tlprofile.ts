import { homedir } from 'node:os'
import { toPosixPath } from '@actions/core'

export function getProfile(): string {
  const home = toPosixPath(homedir())
  return `selected_scheme scheme-infraonly
TEXDIR ${home}/texlive
TEXMFCONFIG ${home}/.texlive/texmf-config
TEXMFHOME ${home}/texmf
TEXMFLOCAL ${home}/texlive/texmf-local
TEXMFSYSCONFIG ${home}/texlive/texmf-config
TEXMFSYSVAR ${home}/texlive/texmf-var
TEXMFVAR ${home}/.texlive/texmf-var
option_doc 0
option_src 0
`
}
