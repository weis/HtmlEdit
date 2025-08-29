import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('color-popover')
export class ColorPopover extends LitElement {
  static styles = css`
    :host { position: absolute; z-index: 10; }
    .panel { background:#111827; color:#f9fafb; border:1px solid #374151; border-radius:6px; padding:8px; display:flex; gap:8px; }
    .swatches { display:grid; grid-template-columns:repeat(6,16px); gap:6px; align-content:start; }
    button.sw { width:16px; height:16px; border-radius:3px; border:1px solid #6b7280; padding:0; }
    button { cursor:pointer; }
  `;

  @property({ type: Boolean }) open = false;
  @property({ type: String }) value = '#000000';

  private swatches = ['#000000','#1f2937','#6b7280','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#111827','#ffffff','#b91c1c'];

  render() {
    if (!this.open) return html``;
    return html`
      <div class="panel">
        <input type="color" .value=${this.value} @input=${(e: Event) => this._emitColor((e.target as HTMLInputElement).value)} />
        <div class="swatches">
          ${this.swatches.map(c => html`<button class="sw" title=${c} style="background:${c}" @click=${() => this._emitColor(c)}></button>`)}
        </div>
        <button @click=${() => this._emitColor('#000000')}>Default</button>
        <button @click=${() => this._emitClose()}>Close</button>
      </div>
    `;
  }

  private _emitColor(color: string) {
    this.dispatchEvent(new CustomEvent('color-change', { detail: { color }, bubbles: true, composed: true }));
  }

  private _emitClose() {
    this.dispatchEvent(new CustomEvent('color-close', { bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'color-popover': ColorPopover;
  }
}

