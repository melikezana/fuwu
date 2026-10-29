"""Run with PYTHONPATH=artifacts/product-qa/font-runtime. Source fonts retained in QA evidence."""
from pathlib import Path
from fontTools import subset
import json

out = Path("artifacts/product-qa/font-originals")
out.mkdir(parents=True, exist_ok=True)
sizes = []
for font in Path("src/fonts").glob("Inter-*.woff2"):
    original = out / font.name
    if not original.exists():
        original.write_bytes(font.read_bytes())
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["kern", "liga", "calt"]
    options.hinting = False
    face = subset.load_font(str(original), options)
    selection = subset.Subsetter(options=options)
    # Latin, Turkish, Latin Extended, punctuation, currency, arrows, replacement glyph.
    selection.populate(unicodes=list(range(0x0000, 0x0180)) + list(range(0x2000, 0x2070)) + list(range(0x20A0, 0x20D0)) + list(range(0x2190, 0x21A0)) + [0x2122, 0x2212, 0xFFFD])
    selection.subset(face)
    subset.save_font(face, str(font), options)
    assert set(map(ord, "ÇçĞğİıÖöŞşÜü₺")).issubset(face.getBestCmap()), "Turkish glyphs must survive"
    sizes.append({"file": str(font), "before": original.stat().st_size, "after": font.stat().st_size})
Path("artifacts/product-qa/font-sizes.json").write_text(json.dumps(sizes, indent=2), encoding="utf-8")
print(sizes)
