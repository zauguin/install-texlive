# Install TeX Live for GitHub Action workflows

[![GitHub Super-Linter](https://github.com/zauguin/ctan-upload/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/zauguin/ctan-upload/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/zauguin/ctan-upload/actions/workflows/check-dist.yml/badge.svg)](https://github.com/zauguin/ctan-upload/actions/workflows/check-dist.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

A GitHub Actions action to install the latest TeX Live version under
`~/texlive`. The list of required packages must be provided using the `packages`
input parameter.

The `~/texlive` is automatically cached. A cache refresh can be forced by
changing the `cache_version` parameter.

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
        uses: zauguin/install-texlive@v4
        with:
          packages: >
            l3build latex latex-bin luatex latex-bin-dev ...
      - name: Use TeX Live
        run: ... whatever you want to install TeX Live for
```

Instead of specifying the packages directly, you can pass a file containing the
list of packages:

```yaml
- name: Install TeX Live
  uses: zauguin/install-texlive@v4
  with:
    package_file: tl_packages
```

If you want to explicitly choose which TeX Live version to install instead of
automatically choosing the latest one, you can add it with the `texlive_version`
key:

```yaml
- name: Install TeX Live
  uses: zauguin/install-texlive@v4
  with:
    package_file: tl_packages
    texlive_version: 2025
```

While the TeX Live pretest is running this can also be used to install the
pretest. Just add the next (currently being tested) version number as
`texlive_version`.

## FAQs

> I miss the "basic" scheme of TeXLive. How can I install that?

Install the package `scheme-basic`. That provides you with all the packages of
the basic scheme.
