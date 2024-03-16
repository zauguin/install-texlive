import { Temporal } from 'temporal-polyfill'
import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { HttpClient } from '@actions/http-client'
import decompress from 'decompress'
import { exec } from '@actions/exec'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import { getProfile } from './tlprofile.js'

function getMandatoryInput(name: string): string {
  return core.getInput(name, { required: true })
}

function getOptionalInput(name: string): string | undefined {
  return core.getInput(name) || undefined
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

function parsePackages(packagesString: string): string[] {
  return [...packagesString.replaceAll(/#.*?(\n|$)/g, '$1').matchAll(/\S+/g)]
    .map(m => m[0])
    .sort()
}

async function calculateCacheKey(
  version: string,
  packages: string[]
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
  const cachePrefix = `texlive-${osid}-${version}-${packageHash}-`
  const cacheKey = cachePrefix + Temporal.Now.plainDateISO('UTC').toString()
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

async function findRepository(): Promise<string | undefined> {
  const http = new HttpClient()
  let mirrorListString: string | undefined
  try {
    const mirrorListResponse = await http.get(
      'https://zauguin.github.io/texlive-mirrors/us'
    )
    if (mirrorListResponse.message.statusCode === 200) {
      mirrorListString = await mirrorListResponse.readBody()
    } else {
      mirrorListString = undefined
    }
  } catch (_) {
    mirrorListString = undefined
  }
  if (mirrorListString === undefined) {
    core.error(
      'Unable to retrive mirror list, falling back to CTAN auto selection'
    )
    return undefined
  }
  const mirrors = [...mirrorListString.matchAll(/\S+/g)].map(m => m[0])
  const mirror = mirrors[Math.floor(Math.random() * mirrors.length)]
  core.info(`Selected mirror ${mirror}`)
  return mirrors[Math.floor(Math.random() * mirrors.length)]
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

export async function run(): Promise<void> {
  try {
    const repository =
      getOptionalInput('repository') ?? (await findRepository())
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

    const cacheKey = await calculateCacheKey(cacheVersion, packages)

    const home = os.homedir()
    const tlPlatform = detectTlPlatform()
    core.addPath(`${home}/texlive/bin/${tlPlatform}`)

    core.info(`Trying to restore with key ${cacheKey.full}`)
    const restoredCache = await cache.restoreCache(
      [`${home}/texlive`],
      cacheKey.full,
      [cacheKey.prefix]
    )
    if (restoredCache === cacheKey.full) {
      core.setOutput('key', restoredCache)
      core.info(`Restored cache with key ${restoredCache}`)
      return
    }

    // Installing TeX Live gets another try clock to handle acceptStale
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
      core.setOutput('key', restoredCache)
      return
    }

    const savedCache = await cache.saveCache([`${home}/texlive`], cacheKey.full)
    core.info(`Updated cache with key ${savedCache}`)
    core.setOutput('key', savedCache)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.toString())
  }
}
