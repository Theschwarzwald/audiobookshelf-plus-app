"""
PDF layout for reflow (Docling, IBM's open-source document layout model).

    python layout_worker.py <in.pdf> <out.json> [threads]

Finds the blocks on each page in reading order: paragraphs, headings, list items, captions, footnotes, and
the page headers / footers (running titles, page numbers) that reflow leaves out. The phone keeps using
the PDF's own text (so read along, search and highlights line up); this only says how it is grouped and
in which order. Runs on the CPU, so it never competes with transcription for GPU memory.

Writes: {"version": 1, "engine": "docling x.y", "pages": {"1": {"w": .., "h": .., "blocks": [
    {"label": "text", "bbox": [left, bottom, right, top]}, ...]}}}   (PDF points, origin bottom-left)
Progress lines on stderr: "PAGES <n>" then "DONE".
"""
import json
import os
import sys


def main():
    src, out = sys.argv[1], sys.argv[2]
    threads = int(sys.argv[3]) if len(sys.argv) > 3 else max(1, min(4, (os.cpu_count() or 2) - 1))
    os.environ.setdefault("OMP_NUM_THREADS", str(threads))

    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption

    opts = PdfPipelineOptions()
    opts.do_ocr = False  # the text comes from the PDF itself (or the server's OCR copy)
    opts.do_table_structure = False  # reflow keeps tables as text; much faster without
    try:
        from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions
    except ImportError:  # older Docling
        from docling.datamodel.pipeline_options import AcceleratorDevice, AcceleratorOptions
    opts.accelerator_options = AcceleratorOptions(num_threads=threads, device=AcceleratorDevice.CPU)

    conv = DocumentConverter(format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=opts)})
    res = conv.convert(src)
    doc = res.document

    pages = {}
    for no, p in (doc.pages or {}).items():
        pages[str(no)] = {"w": float(p.size.width), "h": float(p.size.height), "blocks": []}
    print(f"PAGES {len(pages)}", file=sys.stderr, flush=True)

    # iterate_items walks the document in reading order, page headers / footers included
    if _accepts_layers(doc):
        from docling_core.types.doc import ContentLayer

        walk = doc.iterate_items(with_groups=False, included_content_layers=set(ContentLayer))
    else:
        walk = doc.iterate_items()
    for item, _level in walk:
        label = getattr(item, "label", None)
        label = str(getattr(label, "value", label) or "text")
        for prov in getattr(item, "prov", None) or []:
            pg = pages.get(str(prov.page_no))
            if pg is None:
                continue
            bb = prov.bbox
            try:
                bb = bb.to_bottom_left_origin(page_height=pg["h"])
            except Exception:
                pass
            l, r = float(min(bb.l, bb.r)), float(max(bb.l, bb.r))
            b, t = float(min(bb.b, bb.t)), float(max(bb.b, bb.t))
            pg["blocks"].append({"label": label, "bbox": [round(l, 1), round(b, 1), round(r, 1), round(t, 1)]})

    try:
        import docling

        version = getattr(docling, "__version__", "") or ""
    except Exception:
        version = ""
    if not version:
        try:
            from importlib.metadata import version as v

            version = v("docling")
        except Exception:
            version = "?"
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"version": 1, "engine": f"docling {version}", "pages": pages}, f, separators=(",", ":"))
    print("DONE", file=sys.stderr, flush=True)


def _accepts_layers(doc):
    """Newer Docling hides page headers / footers from iterate_items unless asked for every layer"""
    try:
        import inspect

        return "included_content_layers" in inspect.signature(doc.iterate_items).parameters
    except Exception:
        return False


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # one line the server can show
        print(f"ERROR {type(e).__name__}: {e}", file=sys.stderr, flush=True)
        sys.exit(1)
