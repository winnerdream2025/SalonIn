#!/usr/bin/env python3
import struct, zlib, json, time, urllib.request, urllib.parse

BASE = "https://salonin-production.up.railway.app"
TS = int(time.time())
EMAIL = f"media-{TS}@salonin.test"
PASSWORD = "TestPass123!"

def post_json(path, data):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

# Register + login
print("Registering...")
post_json("/auth/register", {"name":"Media Test","email":EMAIL,"password":PASSWORD,"role":"WORKER","cityId":"dmv"})
print("Logging in...")
login = post_json("/auth/login", {"email":EMAIL,"password":PASSWORD})
token = login.get("accessToken","")
print(f"Token: {token[:30]}...")

# Create valid 1x1 PNG
def make_png():
    sig = b'\x89PNG\r\n\x1a\n'
    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(b'\x00\xff\x00\x00'))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

png_data = make_png()
boundary = "----FormBoundary7MA4YWxkTrZu0gW"
body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="test.png"\r\n'
    f"Content-Type: image/png\r\n\r\n"
).encode() + png_data + f"\r\n--{boundary}--\r\n".encode()

print("Uploading to /media/upload ...")
req = urllib.request.Request(
    BASE + "/media/upload",
    data=body,
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    },
    method="POST"
)
try:
    with urllib.request.urlopen(req) as r:
        result = json.loads(r.read())
        print(f"SUCCESS: {result}")
except urllib.error.HTTPError as e:
    body_bytes = e.read()
    print(f"ERROR {e.code}: {body_bytes.decode()}")
