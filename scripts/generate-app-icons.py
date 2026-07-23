#!/usr/bin/env python3
"""Generate Android/web app icons and splash screens from a source logo."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND_BACKGROUND = (249, 247, 242, 255)
TRANSPARENT = (0, 0, 0, 0)

ANDROID_LAUNCHER_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

ANDROID_FOREGROUND_SIZES = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
}

ANDROID_PORTRAIT_SPLASH = {
    'drawable-port-mdpi': (320, 480),
    'drawable-port-hdpi': (480, 800),
    'drawable-port-xhdpi': (720, 1280),
    'drawable-port-xxhdpi': (960, 1600),
    'drawable-port-xxxhdpi': (1280, 1920),
}

ANDROID_LANDSCAPE_SPLASH = {
    'drawable-land-mdpi': (480, 320),
    'drawable-land-hdpi': (800, 480),
    'drawable-land-xhdpi': (1280, 720),
    'drawable-land-xxhdpi': (1600, 960),
    'drawable-land-xxxhdpi': (1920, 1280),
}

WEB_ICONS = {
    ROOT / 'public/favicon.png': 64,
    ROOT / 'public/assets/icon/favicon.png': 64,
    ROOT / 'public/assets/icon/icon.png': 512,
}

ELECTRON_ASSETS = ROOT / 'electron/assets'

WEB_SPLASH = ROOT / 'public/assets/branding/splash.png'
DEFAULT_SOURCE = ROOT / 'assets/branding/offload-logo-source.jpg'
PROCESSED_SOURCE = ROOT / 'assets/branding/offload-logo-transparent.png'


def remove_white_background(image: Image.Image, threshold: int = 238) -> Image.Image:
    rgba = image.convert('RGBA')
    pixels = rgba.load()
    width, height = rgba.size

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if red >= threshold and green >= threshold and blue >= threshold:
                pixels[x, y] = (red, green, blue, 0)

    return rgba


def trim_transparent(image: Image.Image) -> Image.Image:
    bbox = image.getbbox()
    if not bbox:
        return image
    return image.crop(bbox)


def fit_on_canvas(
    image: Image.Image,
    canvas_width: int,
    canvas_height: int,
    *,
    background: tuple[int, int, int, int] = BRAND_BACKGROUND,
    padding_ratio: float = 0.1,
) -> Image.Image:
    canvas = Image.new('RGBA', (canvas_width, canvas_height), background)
    max_width = int(canvas_width * (1 - padding_ratio * 2))
    max_height = int(canvas_height * (1 - padding_ratio * 2))
    scale = min(max_width / image.width, max_height / image.height)
    target_width = max(1, int(image.width * scale))
    target_height = max(1, int(image.height * scale))
    resized = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
    offset = ((canvas_width - target_width) // 2, (canvas_height - target_height) // 2)
    canvas.paste(resized, offset, resized)
    return canvas


ICON_PADDING = 0.18
FOREGROUND_PADDING = 0.22


def save_branded_square(image: Image.Image, destination: Path, size: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    fitted = fit_on_canvas(image, size, size, padding_ratio=ICON_PADDING)
    fitted.convert('RGB').save(destination, format='PNG', optimize=True)


def save_foreground(image: Image.Image, destination: Path, size: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    fitted = fit_on_canvas(image, size, size, background=TRANSPARENT, padding_ratio=FOREGROUND_PADDING)
    fitted.save(destination, format='PNG', optimize=True)


def render_splash(image: Image.Image, width: int, height: int) -> Image.Image:
    is_landscape = width > height
    padding_ratio = 0.16 if is_landscape else 0.14
    return fit_on_canvas(image, width, height, padding_ratio=padding_ratio).convert('RGB')


def save_splash(image: Image.Image, destination: Path, width: int, height: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    render_splash(image, width, height).save(destination, format='PNG', optimize=True)


def prepare_logo(source: Path, processed: Path) -> Image.Image:
    raw = Image.open(source)
    logo = trim_transparent(remove_white_background(raw))
    processed.parent.mkdir(parents=True, exist_ok=True)
    logo.save(processed, format='PNG', optimize=True)
    return logo


def save_ico(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    sizes = [16, 24, 32, 48, 64, 128, 256]
    images = [image.resize((size, size), Image.Resampling.LANCZOS) for size in sizes]
    images[0].save(
        destination,
        format='ICO',
        sizes=[(img.width, img.height) for img in images],
        append_images=images[1:],
    )


def save_icns(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if sys.platform != 'darwin':
        print(f'Skipping {destination.name} (iconutil is macOS-only). electron-builder can generate it from icon.png.')
        return

    iconset = destination.with_suffix('.iconset')
    if iconset.exists():
        shutil.rmtree(iconset)
    iconset.mkdir()

    iconset_entries = [
        ('icon_16x16.png', 16),
        ('icon_16x16@2x.png', 32),
        ('icon_32x32.png', 32),
        ('icon_32x32@2x.png', 64),
        ('icon_128x128.png', 128),
        ('icon_128x128@2x.png', 256),
        ('icon_256x256.png', 256),
        ('icon_256x256@2x.png', 512),
        ('icon_512x512.png', 512),
        ('icon_512x512@2x.png', 1024),
    ]

    rgb = image.convert('RGBA')
    for filename, size in iconset_entries:
        resized = rgb.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(iconset / filename, format='PNG')

    try:
        subprocess.run(['iconutil', '-c', 'icns', str(iconset), '-o', str(destination)], check=True)
    except subprocess.CalledProcessError:
        print(f'Could not build {destination.name}; electron-builder will derive it from icon.png.')
    finally:
        shutil.rmtree(iconset, ignore_errors=True)


def generate_electron_icons(master: Image.Image) -> None:
    icon_png = ELECTRON_ASSETS / 'icon.png'
    master.save(icon_png, format='PNG', optimize=True)
    save_ico(master, ELECTRON_ASSETS / 'icon.ico')
    save_icns(master, ELECTRON_ASSETS / 'icon.icns')
    print(f'Electron icons: {ELECTRON_ASSETS}')


def build_master(logo: Image.Image, master: Path) -> Image.Image:
    master.parent.mkdir(parents=True, exist_ok=True)
    fitted = fit_on_canvas(logo, 1024, 1024, padding_ratio=ICON_PADDING)
    fitted.save(master, format='PNG', optimize=True)
    return fitted


def generate_icons(source: Path) -> None:
    logo = prepare_logo(source, PROCESSED_SOURCE)
    master_path = ROOT / 'assets/branding/offload-brand-master.png'
    app_icon_master = ROOT / 'assets/branding/offload-app-icon-master.png'
    master = build_master(logo, master_path)
    master.save(app_icon_master, format='PNG', optimize=True)
    generate_electron_icons(master)
    android_res = ROOT / 'android/app/src/main/res'

    for folder, size in ANDROID_LAUNCHER_SIZES.items():
        save_branded_square(logo, android_res / folder / 'ic_launcher.png', size)
        save_branded_square(logo, android_res / folder / 'ic_launcher_round.png', size)

    for folder, size in ANDROID_FOREGROUND_SIZES.items():
        save_foreground(logo, android_res / folder / 'ic_launcher_foreground.png', size)

    for destination, size in WEB_ICONS.items():
        save_branded_square(logo, destination, size)

    for folder, (width, height) in ANDROID_PORTRAIT_SPLASH.items():
        save_splash(logo, android_res / folder / 'splash.png', width, height)

    for folder, (width, height) in ANDROID_LANDSCAPE_SPLASH.items():
        save_splash(logo, android_res / folder / 'splash.png', width, height)

    save_splash(logo, android_res / 'drawable' / 'splash.png', 480, 320)
    save_splash(logo, WEB_SPLASH, 1280, 1920)

    print(f'Generated icons and splash screens from {source}')
    print(f'Transparent logo: {PROCESSED_SOURCE}')
    print(f'Master asset: {master_path}')


def main() -> None:
    parser = argparse.ArgumentParser(description='Generate Offload icons and splash screens.')
    parser.add_argument(
        'source',
        nargs='?',
        default=str(DEFAULT_SOURCE),
        help='Path to the source logo image',
    )
    args = parser.parse_args()
    source = Path(args.source)
    if not source.exists():
        raise SystemExit(f'Source image not found: {source}')
    generate_icons(source)


if __name__ == '__main__':
    main()
