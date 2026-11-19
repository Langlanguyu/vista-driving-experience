"""Verify preparation artifacts; this is not an application acceptance test."""
from pathlib import Path
from zipfile import ZipFile
from urllib.parse import unquote
import hashlib
import json
import re
import xml.etree.ElementTree as ET

from extract_references import NS, content

ROOT = Path(__file__).resolve().parents[1]


def check():
    totals = [0, 0]
    for name, expected_paragraphs, expected_images in [
        ('环境自适应光学调节技术', 83, 1),
        ('盲区透视型 AR-HUD 预警技术', 101, 2),
    ]:
        original = ROOT / f'{name}(1).docx'
        source = ROOT / 'references' / f'{name}.docx'
        extracted = ROOT / 'references' / 'extracted' / name
        assert original.read_bytes() == source.read_bytes(), f'{name}: original differs'
        inventory = json.loads((extracted / 'inventory.json').read_text())
        assert inventory['sha256'] == hashlib.sha256(source.read_bytes()).hexdigest()
        full_text = (extracted / 'full-text.md').read_text()
        with ZipFile(source) as archive:
            doc = ET.fromstring(archive.read('word/document.xml'))
            paragraphs = doc.findall('.//w:p', NS)
            assert len(paragraphs) == expected_paragraphs == inventory['paragraphs']
            for paragraph in paragraphs:
                assert content(paragraph) in full_text, f'{name}: missing paragraph'
            images = [p for p in archive.namelist() if p.startswith('word/media/') and not p.endswith('/')]
            assert len(images) == expected_images
            for image in images:
                assert (extracted / Path(image).name).read_bytes() == archive.read(image)
            assert inventory['equations'] == len(doc.findall('.//m:oMath', NS))
            assert inventory['tables'] == len(doc.findall('.//w:tbl', NS))
        totals[0] += len(paragraphs)
        totals[1] += len(images)
        print(f'PASS {name}: source hash, {len(paragraphs)} paragraphs, {len(images)} images')
    for relative in [
        'AGENTS.md', 'README.md', 'references/README.md', 'docs/ARCHITECTURE.md',
        'docs/R1_SPEC.md', 'docs/REFERENCE_ANALYSIS.md', 'docs/PROGRESS.md',
        'docs/ACCEPTANCE.md', 'docs/DECISIONS.md',
    ]:
        path = ROOT / relative
        assert path.is_file(), relative
        for target in re.findall(r'\]\(([^)]+)\)', path.read_text()):
            if '://' not in target and not target.startswith('#'):
                resolved = path.parent / unquote(target.split('#')[0])
                assert resolved.exists(), f'{relative}: broken link {target}'
    print(f'PASS preparation: {totals[0]} paragraphs, {totals[1]} images, required documents and local links')
    print('Application checks are reported separately by the npm scripts.')


if __name__ == '__main__':
    check()
