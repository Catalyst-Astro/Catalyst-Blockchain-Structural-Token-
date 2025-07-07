#!/bin/bash
# Simple deployment script

if ! command -v vercel &> /dev/null; then
  echo "Vercel CLI is not installed" >&2
  exit 1
fi

vercel --prod
