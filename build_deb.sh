#!/bin/bash
set -e
PACKAGE="fractalmanagergtk"
VERSION=$(grep -m1 '^version' pyproject.toml | cut -d '"' -f2)

fpm -s python -t deb -n "$PACKAGE" -v "$VERSION" --python-use-system-packages .
