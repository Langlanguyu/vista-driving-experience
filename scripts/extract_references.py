"""Lossless source inventory and readable OOXML text extraction (stdlib only).

Run with Python 3 from the repository root. Original DOCX files remain authoritative.
"""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math'}


def content(node):
    chunks = []
    for item in node.iter():
        if item.tag in (f"{{{NS['w']}}}t", f"{{{NS['m']}}}t"):
            chunks.append(item.text or '')
        elif item.tag == f"{{{NS['w']}}}tab":
            chunks.append('\t')
        elif item.tag == f"{{{NS['w']}}}br":
            chunks.append('\n')
    return ''.join(chunks)


def extract(source):
    target = ROOT / 'references' / 'extracted' / source.stem
    target.mkdir(parents=True, exist_ok=True)
    with ZipFile(source) as archive:
        doc = ET.fromstring(archive.read('word/document.xml'))
        lines = [f'# {source.stem}', '',
                 'OOXML 全文提取；P/T 为源文档正文块序号。公式文本为阅读辅助，结构见 math.xml；图片见清单。', '']
        for index, block in enumerate(doc.find('w:body', NS), 1):
            kind = block.tag.split('}')[-1]
            if kind == 'p':
                lines.extend([f'[P{index:03}] {content(block)}', ''])
            elif kind == 'tbl':
                lines.append(f'[T{index:03}]')
                for row in block.findall('w:tr', NS):
                    lines.append(' | '.join(content(cell) for cell in row.findall('w:tc', NS)))
                lines.append('')
        for part in archive.namelist():
            if part.startswith(('word/footnotes', 'word/endnotes', 'word/comments', 'word/header', 'word/footer')) and part.endswith('.xml'):
                lines.extend([f'## {part}', content(ET.fromstring(archive.read(part))), ''])
            if part.startswith('word/media/') and not part.endswith('/'):
                (target / Path(part).name).write_bytes(archive.read(part))
        equations = doc.findall('.//m:oMath', NS)
        math = ET.Element('equations')
        math.extend(equations)
        ET.ElementTree(math).write(target / 'math.xml', encoding='utf-8', xml_declaration=True)
        inventory = {
            'source': str(source.relative_to(ROOT)),
            'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'paragraphs': len(doc.findall('.//w:p', NS)),
            'tables': len(doc.findall('.//w:tbl', NS)),
            'equations': len(equations),
            'parts': archive.namelist(),
        }
        (target / 'inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n')
        (target / 'full-text.md').write_text('\n'.join(lines))
        print(json.dumps(inventory, ensure_ascii=False))


if __name__ == '__main__':
    for source in sorted((ROOT / 'references').glob('*.docx')):
        extract(source)
