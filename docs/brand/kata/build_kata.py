"""Build the Kata logo set as one VectorCraft batch.

The mark: two brush strokes turning the same way form `{` and `}` around an
ensō, with a short lime brush stroke at the centre. Colours are the app's theme tokens.
Every geometric value is in units of the 600 pt master and scales with `k`.
"""
import json
import math
import random
import sys

NAVY = "#17233f"     # --sidebar
LIGHT = "#f2f5ff"    # --sidebar-foreground
LIME = "#d7ef81"     # --lime: the dot on dark grounds
INDIGO = "#3349b3"   # --primary: the dot on light grounds, where lime fails 3:1

STREAKS_L = 11
STREAKS_R = 10


class Batch:
    def __init__(self):
        self.cmds = []

    def add(self, command, **params):
        self.cmds.append({"command": command, "params": params})
        return len(self.cmds) - 1  # step index, for "$N" references

    def ref(self, step, path="id"):
        return f"${step}.{path}"


def brace_points(cx, cy, k, th0, th1, n, cusp, pressure, offset=0.0):
    pts = []
    for i in range(n + 1):
        t = i / n
        th = th0 + (th1 - th0) * t
        d = abs(th - cusp)
        bump = 34.0 * (1 - d / 22.0) ** 3 if d < 22.0 else 0.0
        pull = -6.0 * math.sin(math.pi * d / 50) if d < 50 else 0.0
        r = (190.0 + bump + pull + offset) * k
        pts.append([round(cx + r * math.cos(math.radians(th)), 2),
                    round(cy - r * math.sin(math.radians(th)), 2),
                    round(pressure(t), 3)])
    return pts


def left_pressure(t):
    flick = 0.45 * math.exp(-((t - 0.5) / 0.05) ** 2)
    tail = max(0.0, (t - 0.72) / 0.28) ** 1.6
    return max(0.04, min(1.0, 0.95 - 0.25 * t - flick - 0.9 * tail))


def right_pressure(t):
    flick = 0.4 * math.exp(-((t - 0.5) / 0.05) ** 2)
    tail = max(0.0, (t - 0.7) / 0.3) ** 1.5
    return max(0.04, min(1.0, 0.82 - 0.2 * t - flick - 0.85 * tail))


# The centre stroke: a round ball of ink; the brush lifts off its upper right
# in a short curl that is almost all dry-brush hairlines. `curve` is the brush
# path (a cubic Bezier, landing first); `pressure` maps 0..1 along it to brush
# pressure; `streaks` dry-brush gaps open in the tail, each from somewhere in
# `start`, spread across `spread` of its width.
CENTRE = {"curve": ((0, 14), (24, 8), (32, -36), (-8, -62)),
          "pressure": lambda t: 1.0 if t < 0.22 else max(0.03, 1 - 0.97 * ((t - 0.22) / 0.78) ** 0.85),
          "size": 40, "var": 37, "roundness": 100, "streaks": 7, "start": (0.36, 0.52),
          "spread": 0.75, "gap": (0.8, 1.6), "grow": (1.6, 2.6)}


def bezier(curve, u):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = curve
    m = 1 - u
    return (m ** 3 * x0 + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u ** 3 * x3,
            m ** 3 * y0 + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u ** 3 * y3)


def centre_shift(style):
    """The offset that centres the stroke's ink, judged from its path and
    the brush width along it, so every style sits in the middle of the ring."""
    xs, ys = [], []
    for i in range(101):
        t = i / 100
        x, y = bezier(style["curve"], t)
        half = (style["size"] + style["var"] * (2 * style["pressure"](t) - 1)) / 2
        xs += [x - half, x + half]
        ys += [y - half, y + half]
    return -(min(xs) + max(xs)) / 2, -(min(ys) + max(ys)) / 2


def centre_point(style, shift, cx, cy, k, t, offset=0.0):
    """A point on the centre stroke's path at t (0 = where the brush lands),
    pushed `offset` units sideways, along the path's normal."""
    x, y = bezier(style["curve"], t)
    xa, ya = bezier(style["curve"], t - 0.01)
    xb, yb = bezier(style["curve"], t + 0.01)
    tx, ty = xb - xa, yb - ya
    n = math.hypot(tx, ty) or 1.0
    x, y = x - ty / n * offset, y + tx / n * offset
    return round(cx + (x + shift[0]) * k, 2), round(cy + (y + shift[1]) * k, 2)


def mark(b, cx, cy, k, ink, dot):
    """Draw the mark centred on (cx, cy): the brace strokes in `ink` and a
    brush stroke in `dot` at the centre."""
    rng = random.Random(4)
    b.add("select.none")
    b.add("paint.setStroke", none=True)
    b.add("paint.setFill", color=ink)
    strokes = []
    for th0, th1, cusp, pressure, size, var, count, spread in (
            (98, 262, 180, left_pressure, 44, 36, STREAKS_L, 12),
            (-82, 80, 0, right_pressure, 40, 32, STREAKS_R, 11)):
        main = b.add("path.blob", points=brace_points(cx, cy, k, th0, th1, 160, cusp, pressure),
                     size=size * k, sizeMode="pressure", sizeVariation=var * k,
                     angle=38, roundness=62, fidelity=0.6 * k, merge=False)
        gaps = []
        for _ in range(count):
            start = th0 + (th1 - th0) * rng.uniform(0.56, 0.86)
            stop = th1 + (4 if rng.random() < 0.7 else -(th1 - th0) * rng.uniform(0.03, 0.08))
            offset, gsize, grow = rng.uniform(-spread, spread), rng.uniform(1.6, 3.4), rng.uniform(1.0, 2.2)
            gaps.append(b.add("path.blob",
                              points=brace_points(cx, cy, k, start, stop, 50, cusp,
                                                  lambda t, g=grow: min(1.0, t * g), offset),
                              size=gsize * k, sizeMode="pressure", sizeVariation=gsize * 0.85 * k,
                              roundness=100, fidelity=0.4 * k, merge=False))
        cut = b.add("object.pathfinder.minusFront", ids=[b.ref(main)] + [b.ref(g) for g in gaps])
        strokes.append(b.ref(cut, "ids.0"))
    b.add("effect.apply", ids=strokes, effect="distort.roughen",
          params={"size": 0.16, "detail": 16, "points": "smooth", "relative": True, "seed": 7})
    b.add("effect.expandAppearance", ids=strokes)
    b.add("select.none")
    # the centre is a short brush stroke made like the braces: pressure gives
    # it a dense head and a thinning tail, and dry-brush gaps open in the tail
    st = CENTRE
    shift = centre_shift(st)
    size, var, pressure = st["size"], st["var"], st["pressure"]
    b.add("paint.setFill", color=dot)
    main = b.add("path.blob",
                 points=[[*centre_point(st, shift, cx, cy, k, i / 80), round(pressure(i / 80), 3)]
                         for i in range(81)],
                 size=size * k, sizeMode="pressure", sizeVariation=var * k,
                 angle=38, roundness=st["roundness"], fidelity=0.6 * k, merge=False)
    drng = random.Random(11)
    gaps = []
    n = st["streaks"]
    for j in range(n):
        spread = st["spread"]
        f = -spread + 2 * spread * j / max(1, n - 1) + drng.uniform(-0.08, 0.08)
        t0 = drng.uniform(*st["start"])
        t1 = 1.03 if drng.random() < 0.75 else drng.uniform(0.86, 0.94)
        gsize, grow = drng.uniform(*st["gap"]), drng.uniform(*st["grow"])
        pts = []
        for i in range(41):
            u = i / 40
            t = t0 + (t1 - t0) * u
            half = (size + var * (2 * pressure(min(t, 1.0)) - 1)) / 2
            pts.append([*centre_point(st, shift, cx, cy, k, t, f * half * 0.8), round(min(1.0, u * grow), 3)])
        gaps.append(b.add("path.blob", points=pts, size=gsize * k, sizeMode="pressure",
                          sizeVariation=gsize * 0.85 * k, roundness=100, fidelity=0.4 * k,
                          merge=False))
    cut = b.add("object.pathfinder.minusFront", ids=[b.ref(main)] + [b.ref(g) for g in gaps])
    d_ref = b.ref(cut, "ids.0")
    # the stroke is small, so its ink edge is set in points, not as a share of its size
    b.add("effect.apply", ids=[d_ref], effect="distort.roughen",
          params={"size": 0.55 * k, "detail": 45, "points": "smooth", "relative": False, "seed": 5})
    b.add("effect.expandAppearance", ids=[d_ref])
    b.add("select.none")
    return strokes + [d_ref]


def wordmark(b, x, baseline, size, color, center_on_artboard=None):
    """KATA in Noto Serif JP, outlined so the files need no font. Tracking adds
    space after the last letter too, so a centred wordmark is aligned on its
    outlines rather than placed by justification."""
    t = b.add("text.create", x=x, y=baseline, text="KATA", size=size, font="Noto Serif JP",
              style="SemiBold", color=color)
    b.add("text.setStyle", id=b.ref(t), tracking=360)
    b.add("select.set", ids=[b.ref(t)])
    outl = b.add("type.createOutlines")
    if center_on_artboard is not None:
        b.add("object.align", horizontal="center", to="artboard", artboard=center_on_artboard)
    b.add("select.none")
    return outl


def rect(b, x, y, w, h, color, radius=0):
    b.add("select.none")
    b.add("paint.setFill", color=color)
    b.add("paint.setStroke", none=True)
    r = b.add("shape.rectangle", x=x, y=y, width=w, height=h, radius=radius)
    b.add("select.none")
    return r


def build():
    b = Batch()
    b.add("file.new", name="kata-logo", width=600, height=600, units="Points")
    b.add("artboard.setProps", index=0, name="mark-reversed")
    # 1 mark on light
    b.add("artboard.new", x=700, y=0, width=600, height=600, name="mark")
    mark(b, 1000, 300, 1.0, NAVY, INDIGO)
    # 2 horizontal lockup, reversed
    b.add("artboard.new", x=1400, y=0, width=1460, height=600, name="lockup-horizontal-reversed")
    rect(b, 1400, 0, 1460, 600, NAVY)
    mark(b, 1700, 300, 1.0, LIGHT, LIME)
    wordmark(b, 2040, 300 + 60, 168, LIGHT)
    # 3 horizontal lockup on light
    b.add("artboard.new", x=1400, y=700, width=1460, height=600, name="lockup-horizontal")
    mark(b, 1700, 1000, 1.0, NAVY, INDIGO)
    wordmark(b, 2040, 1000 + 60, 168, NAVY)
    # 4 stacked lockup, reversed
    b.add("artboard.new", x=0, y=700, width=600, height=820, name="lockup-stacked-reversed")
    rect(b, 0, 700, 600, 820, NAVY)
    mark(b, 300, 1000, 1.0, LIGHT, LIME)
    wordmark(b, 0, 1430, 120, LIGHT, center_on_artboard=4)
    # 5 app icon: the mark on a navy tile
    b.add("artboard.new", x=700, y=700, width=600, height=600, name="app-icon")
    rect(b, 700, 700, 600, 600, NAVY, radius=132)
    mark(b, 1000, 1000, 0.98, LIGHT, LIME)
    # 0 the master mark last, so its ids don't shift the others
    rect(b, 0, 0, 600, 600, NAVY)
    mark(b, 300, 300, 1.0, LIGHT, LIME)
    # 6, 7: the web app's sidebar images, transparent so the sidebar's own navy shows through.
    # They sit in a row of their own below every other artboard: art drawn where two artboards
    # overlap is exported by both. Each is cropped to its art, so the app sizes the ink itself.
    b.add("artboard.new", x=0, y=1700, width=600, height=600, name="app-mark")
    parts = mark(b, 300, 2000, 1.0, LIGHT, LIME)
    b.add("select.set", ids=parts)
    b.add("artboard.fitToSelection", index=6)
    b.add("artboard.new", x=700, y=1700, width=700, height=200, name="app-wordmark")
    word = wordmark(b, 700, 1840, 168, LIGHT)
    b.add("select.set", ids=[b.ref(word, "ids.0")])
    b.add("artboard.fitToSelection", index=7)
    b.add("select.none")
    check_artboards_apart(b.cmds)
    return b.cmds


def check_artboards_apart(cmds):
    """Refuse a layout where two artboards overlap: art drawn in the overlap is exported by both,
    so one version would silently carry another's strokes or letters."""
    boards = [("mark-reversed", 0, 0, 600, 600)]
    boards += [(c["params"]["name"], c["params"]["x"], c["params"]["y"], c["params"]["width"],
                c["params"]["height"]) for c in cmds if c["command"] == "artboard.new"]
    for i, (n1, x1, y1, w1, h1) in enumerate(boards):
        for n2, x2, y2, w2, h2 in boards[i + 1:]:
            if x1 < x2 + w2 and x2 < x1 + w1 and y1 < y2 + h2 and y2 < y1 + h1:
                raise SystemExit(f"artboards {n1} and {n2} overlap")


if __name__ == "__main__":
    with open(sys.argv[1], "w", encoding="utf-8") as f:
        json.dump(build(), f)
