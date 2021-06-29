# Install TeX Live for GitHub Action workflows

A GitHub Actions action to install the latest TeX Live version under `~/texlive`.
The list of required packages must be provided using the `packages` input parameter.

*Due to limitations of GitHub Actions composite actions, this does not automatically setup caching.
Do not use this without setting up caching of the `~/texlive` directory first.*

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
        uses: actions/checkout@v2
      - name: Generate unique ID
        id: get-id
        run: |
          echo -n ::set-output name=id::
          cat /proc/sys/kernel/random/uuid
      - name: Load cache
        uses: actions/cache@v2
        with:
          path: ~/texlive
          key: texlive-v0-${{ steps.get-id.outputs.id }}
          restore-keys: texlive-v0-
      - name: Install TeX Live
        uses: zauguin/install-texlive@v1
        with:
          packages: >
            l3build latex latex-bin luatex latex-bin-dev
            ...
      - name: Use TeX Live
        run: ... whatever you want to install TeX Live for
```
