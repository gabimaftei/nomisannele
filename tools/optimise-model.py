#!/usr/bin/env python3
"""
Micșorează un .glb pentru web, fără să piardă niciun triunghi.

    python3 tools/optimise-model.py sursa.glb destinatie.glb

Face trei lucruri:
  1. sortează triunghiurile spațial (cod Morton), ca bucățile vecine din
     geantă să ajungă vecine și în fișier;
  2. renumerotează vârfurile în ordinea în care apar, ca indicii să devină
     previzibili;
  3. cuantizează pozițiile pe int16, cu scara reală mutată în transformarea
     nodului (extensia standard KHR_mesh_quantization).

Rezultatul rămâne un glTF valid: se deschide în Blender, three.js sau
model-viewer la fel ca originalul.
"""
import json, struct, sys, gzip, os

def load(path):
    data = open(path, 'rb').read()
    off, js, binb = 12, None, None
    while off < len(data):
        clen, ctype = struct.unpack('<I4s', data[off:off + 8]); off += 8
        chunk = data[off:off + clen]
        if ctype == b'JSON':      js = json.loads(chunk.rstrip(b'\x00 '))
        elif ctype.startswith(b'BIN'): binb = chunk
        off += clen
    if not js or binb is None:
        raise SystemExit('fișier glTF binar incomplet')
    return js, binb

def bufview(js, binb, i):
    bv = js['bufferViews'][i]
    o = bv.get('byteOffset', 0)
    return binb[o:o + bv['byteLength']]

def pad(b, fill):
    return b + fill * ((4 - len(b) % 4) % 4)

def _part1by2(n):
    n &= 0x3ff
    n = (n | (n << 16)) & 0x30000ff
    n = (n | (n << 8))  & 0x300f00f
    n = (n | (n << 4))  & 0x30c30c3
    n = (n | (n << 2))  & 0x9249249
    return n

def morton(x, y, z):
    return _part1by2(x) | (_part1by2(y) << 1) | (_part1by2(z) << 2)

def optimise(src, dst):
    js, binb = load(src)
    prim = js['meshes'][0]['primitives'][0]
    acc  = js['accessors']
    pacc, iacc = acc[prim['attributes']['POSITION']], acc[prim['indices']]

    pos = list(struct.unpack('<%df' % (pacc['count'] * 3), bufview(js, binb, pacc['bufferView'])))
    ifmt = {5121: 'B', 5123: 'H', 5125: 'I'}[iacc['componentType']]
    idx = list(struct.unpack('<%d%s' % (iacc['count'], ifmt), bufview(js, binb, iacc['bufferView'])))
    if len(pos) // 3 > 65536:
        raise SystemExit('prea multe vârfuri pentru indici pe 16 biți')

    mn = [min(pos[k::3]) for k in range(3)]
    mx = [max(pos[k::3]) for k in range(3)]
    span = [(mx[k] - mn[k]) or 1.0 for k in range(3)]

    # 1) triunghiurile, în ordine spațială
    tris = []
    for t in range(0, len(idx), 3):
        a, b, c = idx[t], idx[t + 1], idx[t + 2]
        grid = [int(((pos[a*3+k] + pos[b*3+k] + pos[c*3+k]) / 3 - mn[k]) / span[k] * 1023)
                for k in range(3)]
        tris.append((morton(*grid), a, b, c))
    tris.sort()

    # 2) vârfurile, în ordinea primei folosiri
    remap, order, new_idx = {}, [], []
    for _, a, b, c in tris:
        for v in (a, b, c):
            if v not in remap:
                remap[v] = len(order); order.append(v)
            new_idx.append(remap[v])
    new_pos = []
    for old in order:
        new_pos.extend(pos[old*3:old*3+3])

    # 3) pozițiile, pe int16
    centre = [(mn[k] + mx[k]) / 2 for k in range(3)]
    half = max(span) / 2
    quant = []
    for i in range(0, len(new_pos), 3):
        for k in range(3):
            q = int(round((new_pos[i+k] - centre[k]) / half * 32767))
            quant.append(max(-32767, min(32767, q)))

    qbytes = struct.pack('<%dh' % len(quant), *quant)
    ibytes = struct.pack('<%dH' % len(new_idx), *new_idx)
    binnew = pad(ibytes, b'\x00') + qbytes

    gltf = {
        "asset": {"version": "2.0", "generator": "nomisannele optimise-model.py"},
        "extensionsUsed": ["KHR_mesh_quantization"],
        "extensionsRequired": ["KHR_mesh_quantization"],
        "scene": 0, "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "scale": [half / 32767] * 3, "translation": centre}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 1}, "indices": 0, "mode": 4}]}],
        "accessors": [
            {"bufferView": 0, "componentType": 5123, "count": len(new_idx), "type": "SCALAR"},
            {"bufferView": 1, "componentType": 5122, "count": len(new_pos)//3, "type": "VEC3",
             "min": [min(quant[k::3]) for k in range(3)],
             "max": [max(quant[k::3]) for k in range(3)]},
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(ibytes), "target": 34963},
            {"buffer": 0, "byteOffset": len(pad(ibytes, b'\x00')), "byteLength": len(qbytes), "target": 34962},
        ],
        "buffers": [{"byteLength": len(binnew)}],
    }
    jb = pad(json.dumps(gltf, separators=(',', ':')).encode(), b' ')
    bb = pad(binnew, b'\x00')
    out = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(jb) + 8 + len(bb))
    out += struct.pack('<I', len(jb)) + b'JSON' + jb
    out += struct.pack('<I', len(bb)) + b'BIN\x00' + bb
    open(dst, 'wb').write(out)

    a, b = os.path.getsize(src), len(out)
    ga = len(gzip.compress(open(src, 'rb').read(), 9))
    gb = len(gzip.compress(out, 9))
    print('%-22s disc %4d->%4d KB   gzip %4d->%4d KB  (-%d%%)'
          % (os.path.basename(src), a//1024, b//1024, ga//1024, gb//1024, 100 - gb*100//ga))

if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    optimise(sys.argv[1], sys.argv[2])
