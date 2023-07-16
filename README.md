# Install TeX Live for GitHub Action workflows

A GitHub Actions action to install the latest TeX Live version under `~/texlive`.
The list of required packages must be provided using the `packages` input parameter.

The `~/texlive` is automatically cached. A cache refresh can be forced by changing the `cache_version` parameter.

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
        uses: actions/checkout@v3
      - name: Install TeX Live
        uses: zauguin/install-texlive@v2
        with:
          packages: >
            l3build latex latex-bin luatex latex-bin-dev
            ...
      - name: Use TeX Live
        run: ... whatever you want to install TeX Live for
```

Instead of specifying the packages directly, you can pass a file containing the list of packages:

```yaml
      - name: Install TeX Live
        uses: zauguin/install-texlive@v2
        with:
           package_file: tl_packages
```
