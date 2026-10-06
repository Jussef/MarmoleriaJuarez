"""
Genera la galería del sitio a partir de las fotos originales.

  Sitio/img/fotos/<Categoría>/*.jpg   →  originales (no se publican)
  Sitio/img/galeria/<slug>/*.webp      →  versiones optimizadas (miniatura + grande)
  Sitio/js/galeria-data.js             →  lista de fotos que usa la sección Galería

Uso:
  python3 -m pip install pillow
  python3 tools/galeria.py

Cada subcarpeta de img/fotos es una categoría. Para agregar fotos basta con
copiarlas a la carpeta correspondiente y volver a correr el script.
"""

import json
import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent / "Sitio"
SRC = ROOT / "img" / "fotos"
OUT = ROOT / "img" / "galeria"
DATA = ROOT / "js" / "galeria-data.js"

THUMB = 720    # lado mayor de la miniatura
LARGE = 1800   # lado mayor de la foto ampliada
EXTS = {".jpg", ".jpeg", ".png", ".webp"}

# Nombre visible y orden de cada carpeta. Las que no estén aquí usan su propio nombre.
CATEGORIES = {
    "Cubiertas de cocina y lavabos": "Cubiertas y lavabos",
    "Pisos de Terrazo": "Pisos de terrazo",
    "Lavaderos": "Lavaderos",
    "Mosaicos": "Mosaicos",
    "Ecaleras-Escalones": "Escaleras",
    "Chimeneas": "Chimeneas",
    "Balones-Arte": "Balones y arte",
    "Moumentos-Capillas": "Monumentos y capillas",
}


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def save(img, size, dest, quality):
    copy = img.copy()
    copy.thumbnail((size, size), Image.LANCZOS)
    copy.save(dest, "WEBP", quality=quality, method=6)
    return copy.size


def main():
    folders = sorted(
        (d for d in SRC.iterdir() if d.is_dir()),
        key=lambda d: list(CATEGORIES).index(d.name) if d.name in CATEGORIES else len(CATEGORIES),
    )

    categories, photos, keep = [], [], set()

    for folder in folders:
        cat = slugify(folder.name)
        files = sorted(f for f in folder.iterdir() if f.suffix.lower() in EXTS)
        if not files:
            continue
        categories.append({"id": cat, "label": CATEGORIES.get(folder.name, folder.name)})
        (OUT / cat).mkdir(parents=True, exist_ok=True)

        for f in files:
            name = slugify(f.stem)
            sm, lg = OUT / cat / f"{name}-sm.webp", OUT / cat / f"{name}-lg.webp"
            keep.update({sm, lg})

            if sm.exists() and lg.exists() and sm.stat().st_mtime >= f.stat().st_mtime:
                with Image.open(sm) as done:
                    w, h = done.size
            else:
                with Image.open(f) as img:
                    img = ImageOps.exif_transpose(img).convert("RGB")
                    w, h = save(img, THUMB, sm, 72)
                    save(img, LARGE, lg, 80)
                print(f"  {cat}/{name}")

            photos.append({
                "cat": cat,
                "sm": sm.relative_to(ROOT).as_posix(),
                "lg": lg.relative_to(ROOT).as_posix(),
                "w": w,
                "h": h,
            })

    # Borra versiones de fotos que ya no existen en img/fotos
    for old in OUT.rglob("*.webp"):
        if old not in keep:
            old.unlink()

    data = {"categories": categories, "photos": photos}
    DATA.write_text(
        "/* Generado por tools/galeria.py — no editar a mano */\n"
        f"window.TZ_GALERIA = {json.dumps(data, ensure_ascii=False, indent=1)};\n",
        encoding="utf-8",
    )
    print(f"Listo: {len(photos)} fotos en {len(categories)} categorías.")


if __name__ == "__main__":
    main()
