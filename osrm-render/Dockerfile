# Self-hosted OSRM for Render (Greater London, MLD).
# The extract is downloaded + processed at BUILD time, so the running service
# just serves osrm-routed. Override REGION_URL/OSRM_BASE to use another area.
FROM osrm/osrm-backend:latest

ARG REGION_URL=https://download.geofabrik.de/europe/united-kingdom/england/greater-london-latest.osm.pbf
ENV OSRM_BASE=greater-london-latest

WORKDIR /data
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && curl -L -o "/data/${OSRM_BASE}.osm.pbf" "$REGION_URL" \
  && osrm-extract -p /opt/car.lua "/data/${OSRM_BASE}.osm.pbf" \
  && osrm-partition "/data/${OSRM_BASE}.osrm" \
  && osrm-customize "/data/${OSRM_BASE}.osrm" \
  && rm -f "/data/${OSRM_BASE}.osm.pbf"

# Render provides $PORT; bind to it (default 5000 for local docker run).
ENTRYPOINT []
EXPOSE 5000
CMD ["/bin/sh", "-c", "osrm-routed --algorithm mld /data/${OSRM_BASE}.osrm -i 0.0.0.0 -p ${PORT:-5000}"]
