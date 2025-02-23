import { Temporal } from 'temporal-polyfill'
import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { HttpClient } from '@actions/http-client'
import decompress from 'decompress'
import { exec } from '@actions/exec'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import { getProfile } from './tlprofile.js'

interface AliveMirror {
  status: 'Alive' | 'Special'
  texlive_version: number
  revision: number
}

type MirrorData =
  | {
      status: 'Dead' | 'Timeout'
    }
  | AliveMirror

interface MirrorList {
  [continent: string]: {
    [country: string]: {
      [mirror: string]: MirrorData
    }
  }
}

function getMandatoryInput(name: string): string {
  return core.getInput(name, { required: true })
}

function getOptionalInput(name: string): string | undefined {
  return core.getInput(name) || undefined
}

function getOptionalNumberInput(name: string): number | undefined {
  const input = getOptionalInput(name)
  if (input === undefined) return undefined
  return parseInt(input)
}

async function inlineOrFilecontent(
  inline: string | undefined,
  filename: string | undefined
): Promise<string | undefined> {
  if (inline !== undefined || filename === undefined) {
    return inline
  }
  const file = await fs.open(filename, 'r')
  const content = await file.readFile({ encoding: 'utf8' })
  await file.close()
  return content
}

export function parsePackages(packagesString: string): string[] {
  return [...packagesString.replaceAll(/#.*?(\n|$)/g, '$1').matchAll(/\S+/g)]
    .map(m => m[0])
    .sort()
}

async function calculateCacheKey(
  version: string,
  packages: string[],
  texlive_version: number | undefined,
  revision: number | undefined
): Promise<{
  prefix: string
  full: string
}> {
  const packageHash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(packages.join())
      )
    )
  )
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  const osid = `${os.platform()}-${os.machine()}`
  const cachePrefix = `texlive-${osid}-${version}-${packageHash}-${texlive_version || 'NONE'}-`
  const cacheKey =
    cachePrefix + (revision ?? Temporal.Now.plainDateISO('UTC').toString())
  return {
    prefix: cachePrefix,
    full: cacheKey
  }
}

type TlPlatform =
  | 'universal-darwin'
  | 'windows'
  | 'x86_64-linux'
  | 'aarch64-linux'
function detectTlPlatform(): TlPlatform {
  const osPlatform = os.platform()
  switch (osPlatform) {
    case 'darwin':
      return 'universal-darwin'
    case 'win32':
      return 'windows'
    case 'linux': {
      const osMachine = os.machine()
      switch (osMachine) {
        case 'x86_64':
          return 'x86_64-linux'
        case 'arm64':
          return 'aarch64-linux'
        default:
          throw new Error(`Unsupported architecture ${osMachine}`)
      }
    }
    default:
      throw new Error(`Unsupported platform ${osPlatform}`)
  }
}

function mirrorIsApplicable(
  mirrorData: MirrorData,
  version: number | undefined
): boolean {
  if (version === undefined) {
    return mirrorData.status === 'Alive'
  }
  if (!(mirrorData.status === 'Alive' || mirrorData.status === 'Special')) {
    return false
  }
  return mirrorData.texlive_version === version
}

async function findRepository(
  version: number | undefined
): Promise<[string, number, number] | undefined> {
  const http = new HttpClient()
  let mirrorList: MirrorList | undefined
  try {
    const mirrorListResponse = await http.get(
      'https://zauguin.github.io/texlive-mirrors/mirrors.json'
    )
    if (mirrorListResponse.message.statusCode === 200) {
      mirrorList = JSON.parse(await mirrorListResponse.readBody())
    } else {
      mirrorList = undefined
    }
  } catch (_) {
    mirrorList = undefined
  }
  if (mirrorList === undefined) {
    core.error(
      'Unable to retrive mirror list, falling back to CTAN auto selection'
    )
    return undefined
  }
  const usMirrors = Object.entries(mirrorList['North America'].USA).filter(
    ([_, data]) => mirrorIsApplicable(data, version)
  ) as [string, AliveMirror][]
  if (usMirrors.length === 0) {
    throw new Error('No mirror available')
  }
  const highestVersion = Math.max(
    ...usMirrors.map(([_, { texlive_version }]) => texlive_version)
  )
  const versionFilteredMirrors = usMirrors.filter(
    ([_, { texlive_version }]) => texlive_version === highestVersion
  )
  const highestRevision = Math.max(
    ...versionFilteredMirrors.map(([_, { revision }]) => revision)
  )
  const filteredMirrors = versionFilteredMirrors
    .filter(([_, { revision }]) => revision === highestRevision)
    .map(([mirror, _]) => mirror)
  const mirror =
    filteredMirrors[Math.floor(Math.random() * filteredMirrors.length)]
  core.info(
    `Selected mirror ${mirror} (TeX Live ${highestVersion}, rev. ${highestRevision})`
  )
  return [mirror, highestVersion, highestRevision]
}

function handleExecResult(description: string, status: number): void {
  if (status === 0) return
  throw new Error(`${description} failed with status code ${status}`)
}

async function installTexLive(
  initialInstall: boolean,
  repository: string | undefined,
  tlPlatform: TlPlatform,
  packages: string[]
): Promise<void> {
  const tlmgr = tlPlatform === 'windows' ? 'tlmgr.bat' : 'tlmgr'
  if (initialInstall) {
    const http = new HttpClient()
    const response = await http.get(
      (repository ?? 'https://mirrors.ctan.org/systems/texlive/tlnet') +
        (tlPlatform === 'windows'
          ? '/install-tl.zip'
          : '/install-tl-unx.tar.gz')
    )
    if (response.message.statusCode !== 200) {
      throw new Error(
        `Downloading installer failed with status code ${response.message.statusCode}`
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const installerBlob = await response.readBodyBuffer!()
    const tmpdir = os.tmpdir()
    const installerDir = `${tmpdir}/install-texlive`
    const profilePath = core.toPosixPath(`${tmpdir}/texlive.profile`)
    await decompress(installerBlob, installerDir, {
      strip: 1
    })
    await fs.writeFile(profilePath, getProfile())
    handleExecResult(
      'Installing TeX Live',
      await exec(
        core.toPlatformPath(
          `${os.tmpdir()}/install-texlive/${tlPlatform === 'windows' ? 'install-tl-windows.bat' : 'install-tl'}`
        ),
        repository === undefined
          ? [`--profile=${profilePath}`]
          : [`--repository=${repository}`, `--profile=${profilePath}`],
        {
          windowsVerbatimArguments: true
        }
      )
    )
    handleExecResult(
      'Setting tlmgr options',
      await exec(tlmgr, ['option', '--', 'autobackup', '0'])
    )
    handleExecResult(
      'Setting repository',
      await exec(tlmgr, ['option', 'repository', repository ?? 'ctan'])
    )
    handleExecResult(
      'Installing packages',
      await exec(tlmgr, ['install', ...packages])
    )
  } else {
    handleExecResult(
      'Setting repository',
      await exec(tlmgr, ['option', 'repository', repository ?? 'ctan'])
    )
  }
  handleExecResult(
    'Updating TeX Live',
    await exec(tlmgr, ['update', '--self', '--all'], {
      windowsVerbatimArguments: true
    })
  )
}

async function resolveRepository(
  texlive_version: number | undefined,
  requested_repository: string | undefined
): Promise<[string | undefined, number | undefined, number | undefined]> {
  if (requested_repository !== undefined) {
    return [requested_repository, texlive_version, undefined]
  }
  return (
    (await findRepository(texlive_version)) || [undefined, undefined, undefined]
  )
}

export async function run(): Promise<void> {
  try {
    const [repository, texlive_version, revision] = await resolveRepository(
      getOptionalNumberInput('texlive_version'),
      getOptionalInput('repository')
    )
    const packageFile = getOptionalInput('package_file')
    const packagesInline = getOptionalInput('packages')
    const cacheVersion = getMandatoryInput('cache_version')
    const acceptStale = core.getBooleanInput('accept-stale')

    const packages = await (async () => {
      const packageString = await inlineOrFilecontent(
        packagesInline,
        packageFile
      )
      if (packageString === undefined) {
        throw new Error('package-file or packages input required')
      }
      return parsePackages(packageString)
    })()

    const cacheKey = await calculateCacheKey(
      cacheVersion,
      packages,
      texlive_version,
      revision
    )

    const home = os.homedir()
    const tlPlatform = detectTlPlatform()
    core.addPath(`${home}/texlive/bin/${tlPlatform}`)

    core.info(`Trying to restore with key ${cacheKey.full}`)
    const restoredCache = await cache.restoreCache(
      ['~/texlive'],
      cacheKey.full,
      [cacheKey.prefix]
    )
    if (restoredCache === cacheKey.full) {
      core.setOutput('cache_key', restoredCache)
      core.info(`Restored cache with key ${restoredCache}`)
      return
    }

    // Installing TeX Live gets another try block to handle acceptStale
    try {
      await installTexLive(
        restoredCache === undefined,
        repository,
        tlPlatform,
        packages
      )
    } catch (error) {
      if (!acceptStale) {
        throw error
      }
      // We can't accept a failed update if we didn't restore a valid state before.
      if (restoredCache === undefined) {
        throw error
      }
      core.setOutput('cache_key', restoredCache)
      return
    }

    await cache.saveCache(['~/texlive'], cacheKey.full)
    core.info(`Updated cache with key ${cacheKey.full}`)
    core.setOutput('cache_key', cacheKey.full)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.toString())
  }
}
