#!/usr/bin/env bash
# Prepare an OSM extract for OSRM. Default: Greater London (covers the bulk of
# the demo listings). Override with REGION_URL / REGION_BASE for another area.
# Runs the MLD pipeline: extract -> partition -> customize.
set -euo pipefail

DATA_DIR="$(cd "$(dirname "$0")/.." && pwd)/osrm/data"
PBF_URL="${REGION_URL:-https://download.geofabrik.de/europe/poland/mazowieckie-latest.osm.pbf}"
BASE="${REGION_BASE:-mazowieckie-latest}"
PBF="$BASE.osm.pbf"
IMG="osrm/osrm-backend:latest"

mkdir -p "$DATA_DIR"
cd "$DATA_DIR"

if [ ! -f "$PBF" ]; then
  echo "[osrm] downloading $PBF_URL"
  curl -L -o "$PBF" "$PBF_URL"
fi

echo "[osrm] extract"
docker run --rm -v "$PWD:/data" "$IMG" osrm-extract -p /opt/car.lua "/data/$PBF"
echo "[osrm] partition"
docker run --rm -v "$PWD:/data" "$IMG" osrm-partition "/data/$BASE.osrm"
echo "[osrm] customize"
docker run --rm -v "$PWD:/data" "$IMG" osrm-customize "/data/$BASE.osrm"

echo "[osrm] done — $BASE.osrm ready in $DATA_DIR"
