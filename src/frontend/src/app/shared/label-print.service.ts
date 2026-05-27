import { Injectable } from '@angular/core';
import JsBarcode from 'jsbarcode';

export interface ProductLabelData {
  id: number;
  title: string;
  barcode: string;
  locationName?: string; // e.g. "Main Building › Zone A › Shelf 3"
}

export interface LocationLabelData {
  code: string; // e.g. BG1-ZOA-001
  building?: string;
  zone?: string;
  shelf?: string;
}

@Injectable({ providedIn: 'root' })
export class LabelPrintService {
  /** Generate a Code128 barcode as an SVG string. */
  generateBarcodeSvg(text: string): string {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, text, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: 1.5,
      height: 40,
    });
    return svg.outerHTML;
  }

  /** Open a new window with the label and trigger the browser print dialog. */
  printProductLabel(product: ProductLabelData): void {
    const barcodeSvg = this.generateBarcodeSvg(product.barcode);
    const locationLine = product.locationName
      ? `<p class="label-location">${this.escape(product.locationName)}</p>`
      : '';

    this.openPrintWindow(`
      <div class="label">
        <div class="label-barcode">${barcodeSvg}</div>
        <div class="label-text">
          <p class="label-title">${this.escape(product.title)}</p>
          <p class="label-code">${this.escape(product.barcode)}</p>
          ${locationLine}
        </div>
      </div>
    `);
  }

  /** Print a label for a shelf location. */
  printLocationLabel(location: LocationLabelData): void {
    const barcodeSvg = this.generateBarcodeSvg(location.code);
    const breadcrumb = [location.building, location.zone, location.shelf]
      .filter(Boolean)
      .map((s) => this.escape(s!))
      .join(' › ');

    this.openPrintWindow(`
      <div class="label">
        <div class="label-barcode">${barcodeSvg}</div>
        <div class="label-text">
          <p class="label-code">${this.escape(location.code)}</p>
          ${breadcrumb ? `<p class="label-location">${breadcrumb}</p>` : ''}
        </div>
      </div>
    `);
  }

  private openPrintWindow(bodyContent: string): void {
    const win = window.open('', '_blank', 'width=600,height=400');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Label</title>
  <style>
    @page {
      /* 90mm × 20mm — adjust in the print dialog for your tape width */
      size: 90mm 20mm;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: sans-serif;
      width: 90mm;
      height: 20mm;
      display: flex;
      align-items: stretch;
      padding: 1mm;
    }
    .label {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 4mm;
      width: 100%;
    }
    .label-barcode {
      flex-shrink: 0;
    }
    .label-barcode svg {
      display: block;
      height: 16mm;
      width: auto;
    }
    .label-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.8mm;
      overflow: hidden;
    }
    .label-title {
      font-size: 12pt;
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label-code {
      font-size: 10pt;
      font-family: monospace;
      letter-spacing: 0.3pt;
      white-space: nowrap;
    }
    .label-location {
      font-size: 8.5pt;
      color: #555;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  </style>
</head>
<body>
  ${bodyContent}
  <script>
    window.onload = function() { window.print(); window.close(); };
  </script>
</body>
</html>`);
    win.document.close();
  }

  private escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
