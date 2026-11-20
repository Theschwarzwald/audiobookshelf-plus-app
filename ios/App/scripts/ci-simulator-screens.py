#!/usr/bin/env python3
"""
ABS+: run the iOS simulator build and save screenshots and the app's log (used by .github/workflows/build-ios.yml).

  python3 ios/App/scripts/ci-simulator-screens.py <built .app> <output folder>

Boots an iPhone simulator, installs the app, waits for it to start, then taps through the first-run screens
(looks, colour vision, the tutorial) by their button labels with Facebook's idb, saving a screenshot at each
step. The log shows whether the ABS+ native plugins load and what the web app reports. Nothing here fails the
build: a step that can't be done is noted in steps.txt and the rest carries on.
"""
import glob
import json
import os
import plistlib
import shutil
import subprocess
import sys
import time

app = sys.argv[1] if len(sys.argv) > 1 else (glob.glob('ios/App/build/Build/Products/Debug-iphonesimulator/*.app') + [''])[0]
out = sys.argv[2] if len(sys.argv) > 2 else 'sim-screens'
os.makedirs(out, exist_ok=True)
notes = open(os.path.join(out, 'steps.txt'), 'w')


def note(msg):
    print(msg, flush=True)
    notes.write(msg + '\n')
    notes.flush()


def run(args, check=True, timeout=120):
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if check and r.returncode != 0:
        raise RuntimeError(f"{' '.join(args)} -> {r.returncode}: {r.stderr.strip()[:400]}")
    return r.stdout


if not app or not os.path.isdir(app):
    note(f'No built app found ({app!r})')
    sys.exit(0)
info = plistlib.load(open(os.path.join(app, 'Info.plist'), 'rb'))
bundle_id, executable = info['CFBundleIdentifier'], info['CFBundleExecutable']
note(f'App: {app} ({bundle_id})')

# An iPhone with a Dynamic Island if there is one (newest iOS runtime first)
devices = json.loads(run(['xcrun', 'simctl', 'list', 'devices', 'available', '-j']))['devices']
phones = []
for runtime, devs in devices.items():
    if 'iOS' not in runtime:
        continue
    for d in devs:
        if d['name'].startswith('iPhone'):
            phones.append((runtime, 'Pro' in d['name'], d['name'], d['udid']))
phones.sort(reverse=True)
if not phones:
    note('No iPhone simulator available')
    sys.exit(0)
runtime, _, name, udid = phones[0]
note(f'Simulator: {name} ({runtime.split(".")[-1]}) {udid}')
run(['xcrun', 'simctl', 'boot', udid], check=False)
run(['xcrun', 'simctl', 'bootstatus', udid, '-b'], timeout=600)
run(['xcrun', 'simctl', 'ui', udid, 'appearance', 'dark'], check=False)

log_file = open(os.path.join(out, 'app.log'), 'w')
logger = subprocess.Popen(
    ['xcrun', 'simctl', 'spawn', udid, 'log', 'stream', '--style', 'compact', '--level', 'debug', '--predicate', f'process == "{executable}"'],
    stdout=log_file, stderr=subprocess.STDOUT)

shot_no = [0]


def shot(label):
    shot_no[0] += 1
    path = os.path.join(out, f'{shot_no[0]:02d}-{label}.png')
    run(['xcrun', 'simctl', 'io', udid, 'screenshot', path], check=False)
    note(f'screenshot {os.path.basename(path)}')


run(['xcrun', 'simctl', 'install', udid, app], timeout=300)
note(run(['xcrun', 'simctl', 'launch', udid, bundle_id]).strip())
time.sleep(35)  # the web app loads and the first screen settles
shot('launch')

idb = shutil.which('idb')


def elements():
    raw = run([idb, 'ui', 'describe-all', '--udid', udid, '--json'], timeout=60)
    try:
        data = json.loads(raw)
    except ValueError:
        data = [json.loads(line) for line in raw.splitlines() if line.strip().startswith('{')]
    return data if isinstance(data, list) else [data]


def tap(label, wait=3):
    """Tap the first on-screen element whose accessibility label is (or starts with) `label`"""
    if not idb:
        note(f'idb missing: cannot tap {label!r}')
        return False
    try:
        els = elements()
        hit = next((e for e in els if (e.get('AXLabel') or '').strip() == label), None) or next(
            (e for e in els if (e.get('AXLabel') or '').strip().startswith(label)), None)
        if not hit:
            labels = sorted({(e.get('AXLabel') or '').strip() for e in els if (e.get('AXLabel') or '').strip()})
            note(f'no element {label!r}; on screen: {labels[:40]}')
            return False
        f = hit['frame']
        x, y = f['x'] + f['width'] / 2, f['y'] + f['height'] / 2
        run([idb, 'ui', 'tap', '--udid', udid, str(int(x)), str(int(y))])
        note(f'tapped {label!r} at {int(x)},{int(y)}')
        time.sleep(wait)
        return True
    except Exception as e:  # keep going: the screenshots so far are still useful
        note(f'tap {label!r} failed: {e}')
        return False


if tap('Continue'):
    shot('colour-vision')
if tap('Continue'):
    shot('tutorial-1')
for page in range(2, 10):
    if not tap('Next', wait=2):
        break
    shot(f'tutorial-{page}')
if tap("I'll explore myself", wait=6):
    shot('after-tutorial')
    time.sleep(5)
    shot('after-tutorial-settled')

if idb:
    try:
        with open(os.path.join(out, 'screen-elements.json'), 'w') as fh:
            json.dump(elements(), fh, indent=1)
    except Exception as e:
        note(f'describe-all failed: {e}')

time.sleep(3)
logger.terminate()
log_file.close()
note('done')
