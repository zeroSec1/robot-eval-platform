import json, os, subprocess, sys

eps = json.load(open('src/data/real-episodes.json'))
jobs = []
for e in eps:
    v = e.get('video')
    if not v:
        continue
    url = v['url']
    if not (url.startswith('/videos/lerobot-') or url.startswith('/videos/BensoAI-')):
        continue
    src = 'public' + url
    ds = url.split('/')[2]
    out = f"public/videos-h264/{ds}/{e['episodeId']}.mp4"
    jobs.append((src, v['fromS'], v['toS'], out))

print(f"{len(jobs)} clips to transcode", flush=True)
done = fail = skip = 0
for i, (src, fromS, toS, out) in enumerate(jobs):
    if os.path.exists(out) and os.path.getsize(out) > 0:
        skip += 1
        continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    r = subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-ss', str(fromS), '-to', str(toS), '-i', src,
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
        out + '.tmp.mp4',
    ], capture_output=True, text=True)
    if r.returncode == 0:
        os.rename(out + '.tmp.mp4', out)
        done += 1
    else:
        fail += 1
        print(f"FAIL {out}: {r.stderr[:200]}", flush=True)
    if (i + 1) % 25 == 0:
        print(f"progress {i+1}/{len(jobs)} (ok={done} fail={fail} skip={skip})", flush=True)

print(f"DONE: ok={done} fail={fail} skip={skip}", flush=True)
