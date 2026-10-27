#!/usr/bin/env bash
set -euo pipefail

readonly VERSION="4.17.0"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
config_dir="/etc/chirpstack"
profiles_dir="$script_dir"
bin_dir="/opt/chirpstack-import-$VERSION"
tmp_dir=""

usage() {
    cat <<EOF
Usage: bash import-device-profiles.sh [options]

Download and run the ChirpStack $VERSION PostgreSQL importer on Linux.
The binary is kept separately from the installed ChirpStack service.

Options:
  -c, --config DIR    Configuration directory (default: /etc/chirpstack).
  -d, --dir DIR       Repository root (default: this script's directory).
  -b, --bin-dir DIR   Binary directory (default: /opt/chirpstack-import-$VERSION).
  -h, --help          Show this help.

The configuration must point to the PostgreSQL database used by ChirpStack 4.17.
EOF
}

fail() {
    printf 'Error: %s\n' "$*" >&2
    exit 1
}

cleanup() {
    if [[ -n "$tmp_dir" ]]; then
        rm -rf -- "$tmp_dir"
    fi
}

trap cleanup EXIT

while [[ $# -gt 0 ]]; do
    case "$1" in
        -c|--config|-d|--dir|-b|--bin-dir)
            [[ $# -ge 2 && -n "$2" ]] || fail "Missing directory after $1."
            case "$1" in
                -c|--config) config_dir="$2" ;;
                -d|--dir) profiles_dir="$2" ;;
                -b|--bin-dir) bin_dir="$2" ;;
            esac
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            fail "Unknown option: $1. Use --help for usage."
            ;;
    esac
done

[[ -d "$config_dir" ]] || fail "Configuration directory not found: $config_dir"
[[ -d "$profiles_dir/vendors" ]] || fail "Repository vendors directory not found: $profiles_dir/vendors"
[[ "$(uname -s)" == "Linux" ]] || fail "This script requires Linux."

case "$(uname -m)" in
    x86_64|amd64) arch="amd64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) fail "Unsupported architecture. Use a Linux amd64 or arm64 machine." ;;
esac

binary="$bin_dir/chirpstack"
expected_version="chirpstack $VERSION"

if [[ -x "$binary" ]] && [[ "$("$binary" --version 2>/dev/null)" == "$expected_version" ]]; then
    printf 'Using cached %s: %s\n' "$expected_version" "$binary"
else
    for command in curl tar mktemp install; do
        command -v "$command" >/dev/null 2>&1 || fail "Required command not found: $command"
    done

    mkdir -p -- "$bin_dir"
    tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/chirpstack-import-$VERSION.XXXXXXXX")"
    url="https://artifacts.chirpstack.io/downloads/chirpstack/chirpstack_${VERSION}_postgres_linux_${arch}.tar.gz"

    printf 'Downloading %s for Linux %s...\n' "$expected_version" "$arch"
    curl --fail --location --silent --show-error --retry 3 \
        --connect-timeout 20 --max-time 300 \
        --output "$tmp_dir/chirpstack.tar.gz" "$url"
    tar -xzf "$tmp_dir/chirpstack.tar.gz" -C "$tmp_dir" chirpstack

    [[ "$("$tmp_dir/chirpstack" --version)" == "$expected_version" ]] \
        || fail "The downloaded binary does not match $expected_version."

    install -m 0755 -- "$tmp_dir/chirpstack" "$binary"
fi

printf 'Importing profiles from %s using configuration %s...\n' "$profiles_dir" "$config_dir"
"$binary" -c "$config_dir" import-device-profiles -d "$profiles_dir"
printf 'Device-profile import completed successfully.\n'
