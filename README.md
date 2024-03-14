# Install TeX Live for GitHub Action workflows

A GitHub Actions action to install the latest TeX Live version under `~/texlive`.

## Selecting packages to install

### Package list as input parameter

The list of required packages must be provided using the `packages` input parameter.

To use this in a Workflow, you can use

```yaml
name: Example workflow
on:
  push:

jobs:
  texlive:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Install TeX Live
        uses: zauguin/install-texlive@v3
        with:
          packages: >
            l3build latex latex-bin luatex latex-bin-dev
            ...
      - name: Use TeX Live
        run: ... whatever you want to install TeX Live for
```

### Package list as file

Instead of specifying the packages directly, you can pass a file containing the list of packages:

```yaml
      - name: Install TeX Live
        uses: zauguin/install-texlive@v3
        with:
           package_file: tl_packages
```

## Caching

The directory `~/texlive` is automatically cached.
A cache refresh can also be forced by changing the `cache_version` parameter.

## FAQs

> I miss the "basic" scheme of TeXLive. How can I install that?

Install the package `scheme-basic`. That provides you with all the packages of the basic scheme.
