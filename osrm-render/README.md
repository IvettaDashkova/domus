# Self-hosted OSRM on Render

Hosts the routing engine used by `/api/route/plan` (Phase 4). The Dockerfile
downloads the Greater London extract and runs the OSRM MLD pipeline at build
time; the service serves `osrm-routed`.

## Deploy

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → connect the repo → **Apply**.
   It reads `/render.yaml` and builds `osrm-render/Dockerfile`.
3. First build downloads ~121 MB + processes (a few minutes). Peak RAM ~230 MB,
   so the **free 512 MB plan fits Greater London**.
4. Copy the service URL, e.g. `https://domus-osrm.onrender.com`.

## Wire it to Vercel

```bash
vercel env add OSRM_URL production   # paste the Render URL
vercel deploy --prod
```

`/api/route/plan` will then reach OSRM in production.

## Notes

- **Free services sleep** after ~15 min idle → the first route request after a
  sleep cold-starts the container (~15–40 s).
- Greater London only — listings outside it won't route. For wider coverage use
  a bigger extract (override `REGION_URL`) and a paid plan with more RAM.
- Verify: `curl https://<service>/route/v1/driving/-0.1278,51.5074;-0.1419,51.5014?overview=false`
