#!/usr/bin/env bash
# Prepare a SMALL OSM extract for OSRM (Phase 0: prove one /route call).
# Isle of Wight (~3 MB) — tiny, fast to process. Real coverage comes in the
# routing phase. Runs the MLD pipeline: extract -> partition -> customize.
set -euo pipefail

DATA_DIR="$(cd "$(dirname "$0")/.." && pwd)/osrm/data"
PBF_URL="https://download.geofabrik.de/europe/united-kingdom/england/isle-of-wight-latest.osm.pbf"
PBF="isle-of-wight-latest.osm.pbf"
BASE="isle-of-wight-latest"
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
