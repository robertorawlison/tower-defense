"""Converte RELATORIO.md em RELATORIO.html (estilizado para impressao/PDF).

Suporta o subconjunto de Markdown usado no relatorio: titulos (#, ##, ###),
negrito (**), codigo inline (`), citacoes (>), listas (- e aninhadas), linhas
horizontais (---) e paragrafos.
"""
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "RELATORIO.md"
OUT = ROOT / "RELATORIO.html"


def inline(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    return text


def convert(md: str) -> str:
    lines = md.split("\n")
    out = []
    i = 0
    n = len(lines)

    def close_list(stack):
        while stack:
            out.append("</ul>")
            stack.pop()

    list_stack = []  # indent levels

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # blank line
        if not stripped:
            close_list(list_stack)
            i += 1
            continue

        # horizontal rule
        if stripped == "---":
            close_list(list_stack)
            out.append("<hr>")
            i += 1
            continue

        # headings
        m = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if m:
            close_list(list_stack)
            level = len(m.group(1))
            out.append(f"<h{level}>{inline(m.group(2))}</h{level}>")
            i += 1
            continue

        # blockquote (junta linhas consecutivas com '>')
        if stripped.startswith(">"):
            close_list(list_stack)
            buf = []
            while i < n and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip()[1:].strip())
                i += 1
            text = " ".join(b for b in buf if b)
            out.append(f"<blockquote>{inline(text)}</blockquote>")
            continue

        # list item
        m = re.match(r"^(\s*)-\s+(.*)$", line)
        if m:
            indent = len(m.group(1))
            level = 1 if indent >= 2 else 0
            # ajusta profundidade da pilha
            while len(list_stack) > level + 1:
                out.append("</ul>")
                list_stack.pop()
            while len(list_stack) < level + 1:
                out.append("<ul>")
                list_stack.append(indent)
            out.append(f"<li>{inline(m.group(2))}</li>")
            i += 1
            continue

        # paragrafo (junta linhas consecutivas comuns)
        close_list(list_stack)
        buf = [stripped]
        i += 1
        while i < n and lines[i].strip() and not re.match(
            r"^(#{1,6}\s|>|\s*-\s|---)", lines[i]
        ):
            buf.append(lines[i].strip())
            i += 1
        out.append(f"<p>{inline(' '.join(buf))}</p>")

    close_list(list_stack)
    return "\n".join(out)


CSS = """
@page { size: A4; margin: 2cm 2.2cm; }
* { box-sizing: border-box; }
body {
  font-family: "Segoe UI", Calibri, Arial, sans-serif;
  font-size: 11pt; line-height: 1.5; color: #1a1a2e; max-width: 800px;
  margin: 0 auto; padding: 0;
}
h1 { font-size: 22pt; color: #16213e; border-bottom: 3px solid #ffd166;
     padding-bottom: 6px; margin-top: 0; }
h2 { font-size: 16pt; color: #0f3460; margin-top: 26px;
     border-bottom: 1px solid #ccc; padding-bottom: 4px; page-break-after: avoid; }
h3 { font-size: 13pt; color: #1f5aa0; margin-top: 20px; page-break-after: avoid; }
p { margin: 8px 0; text-align: justify; }
ul { margin: 8px 0 8px 0; padding-left: 22px; }
li { margin: 4px 0; }
strong { color: #16213e; }
code { background: #eef1f6; padding: 1px 5px; border-radius: 4px;
       font-family: Consolas, monospace; font-size: 0.9em; color: #b5374f; }
blockquote {
  margin: 10px 0; padding: 8px 16px; background: #f4f7fb;
  border-left: 4px solid #ffd166; color: #333; font-style: italic;
}
hr { border: none; border-top: 1px solid #ddd; margin: 22px 0; }
"""


def main():
    md = SRC.read_text(encoding="utf-8")
    body = convert(md)
    doc = (
        "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'>"
        "<title>Relatorio</title><style>" + CSS + "</style></head><body>"
        + body + "</body></html>"
    )
    OUT.write_text(doc, encoding="utf-8")
    print(f"OK: {OUT}")


if __name__ == "__main__":
    main()
