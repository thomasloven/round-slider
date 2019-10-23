import {
  LitElement,
  html,
  css,
  svg,
} from "lit-element";

class RoundSlider extends LitElement {

  static get properties() {
    return {
      value: {type: Number},
      high: {type: Number},
      low: {type: Number},
      min: {type: Number},
      max: {type: Number},
      step: {type: Number},
      radius: {type: Number},
      startAngle: {type: Number},
      arcLength: {type: Number},
      handleSize: {type: Number},
      disabled: {type: Boolean},
      dragging: {type: Boolean, reflect: true},
      rtl: {type: Boolean},
    }
  }

  constructor() {
    super();
    this.min = 0;
    this.max = 100;
    this.step = 1;
    this.radius = undefined;
    this.startAngle = 135;
    this.arcLength = 270;
    this.handleSize = 6;
    this.disabled = false;
    this.dragging = false;
    this.rtl = false;
  }

  get _r0() {
    if(!this.clientWidth)
      return 80;

    let left = 1;
    if(!this._angleInside(180))
      left = Math.max(
        -Math.cos(this._start),
        -Math.cos(this._end)
      );
    let right = 1;
    if(!this._angleInside(0))
      right = Math.max(
        Math.cos(this._start),
        Math.cos(this._end)
      );

    if (this.radius)
      this.style.width = `${this.radius*(left+right)}px`;
    return this.clientWidth/(left+right);
  }
  get _rArc() {
    return this._r0 - this.handleSize*1.5;
  }
  get _start() {
    return this.startAngle*Math.PI/180;
  }
  get _len() {
    return Math.min(this.arcLength*Math.PI/180, 2*Math.PI-0.01);
  }
  get _end() {
    return this._start + this._len;
  }

  get _isDisabled() {
    return this.disabled || (this.value === undefined && this.high === undefined && this.low === undefined);
  }

  _angleInside(angle) {
    let a = (this.startAngle + this.arcLength/2 - angle + 180 + 360) % 360 - 180;
    return (a < this.arcLength/2 && a > -this.arcLength/2);
  }

  _angle2xy(angle) {
    if(this.rtl)
      return {x: -Math.cos(angle), y: Math.sin(angle)}
    return {x: Math.cos(angle), y: Math.sin(angle)}
  }

  _xy2angle(x,y) {
    if(this.rtl)
      x = -x;
    return (Math.atan2(y,x) - this._start + 2*Math.PI) % (2*Math.PI);
  }


  _getBoundaries() {
    const margin = this.handleSize * 1.5;

    let up = this._r0;
    const start = this._angle2xy(this._start);
    const end = this._angle2xy(this._end);
    if(!this._angleInside(270))
      up =  Math.max(
        -this._rArc*start.y + margin,
        -this._rArc*end.y + margin
      );

    let down = this._r0;
    if(!this._angleInside(90))
      down = Math.max(
        this._rArc*start.y + margin,
        this._rArc*end.y + margin
      );

    let left = this._r0;
    if(!this._angleInside(180))
      left = Math.max(
        -this._rArc*start.x + margin,
        -this._rArc*end.x + margin
      );

    let right = this._r0;
    if(!this._angleInside(0))
      right = Math.max(
        this._rArc*start.x + margin,
        this._rArc*end.x + margin
      );

    return { up, down, left, right };
  }

  dragStart(ev) {
    if(!ev.target.classList.contains("handle")) return;

    let handle = ev.target;
    if(handle.classList.contains("overflow"))
      handle = handle.nextElementSibling
    handle.setAttribute('r', this.handleSize*1.5);

    const min = handle.id === "high" ? this.low : this.min;
    const max = handle.id === "low" ? this.high : this.max;
    this._rotation = { handle, min, max };
    this.dragging = true;
  }

  dragEnd(ev) {
    if(!this._rotation) return;

    const handle = this._rotation.handle;
    handle.setAttribute('r', this.handleSize);

    this._rotation = false;
    this.dragging = false;

    let event = new CustomEvent('value-changed', {
      detail: {
        [handle.id] : this[handle.id],
      }
    });
    this.dispatchEvent(event);

    if(this.low && this.low >= 0.99*this.max)
      this._reverseOrder = true;
    else
      this._reverseOrder = false;
  }

  drag(ev) {
    if(!this._rotation) return;

    ev.preventDefault();

    const mouseX = (ev.type === "touchmove") ? ev.touches[0].clientX : ev.clientX;
    const mouseY = (ev.type === "touchmove") ? ev.touches[0].clientY : ev.clientY;

    const rect = this.shadowRoot.querySelector("svg").getBoundingClientRect();
    const boundaries = this._getBoundaries();
    const x = mouseX - (rect.x + boundaries.left);
    const y = mouseY - (rect.y + boundaries.up);

    // const angle = (Math.atan2(y,x) - this._start + 2*Math.PI) % (2*Math.PI);
    const angle = this._xy2angle(x,y);

    const pos = Math.round((angle/this._len*(this.max - this.min) + this.min)/this.step)*this.step;
    if(pos < this._rotation.min || pos > this._rotation.max) return;

    const handle = this._rotation.handle;
    this[handle.id] = pos;

    let event = new CustomEvent('value-changing', {
      detail: {
        [handle.id] : pos,
      }
    });
    this.dispatchEvent(event);
  }

  firstUpdated() {
    document.addEventListener('mouseup', this.dragEnd.bind(this));
    document.addEventListener('touchend', this.dragEnd.bind(this), {passive: false});
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('touchmove', this.drag.bind(this), {passive: false});
  }

  _renderArc(start, end, r=1) {
    const diff = end-start;
    start = this._angle2xy(start);
    end = this._angle2xy(end);
    return `
      M ${r*start.x} ${r*start.y}
      A ${r} ${r},
        0,
        ${(diff) > Math.PI ? "1" : "0"} ${this.rtl ? "0" : "1"},
        ${r*end.x} ${r*end.y}
    `;
  }

  _valueFrac(val) {
    return (this[val]-this.min)/(this.max-this.min);
  }

  _renderHandle(id) {
    const theta = this._start + this._valueFrac(id)*this._len;
    const pos = this._angle2xy(theta);
    return svg`
        <circle
          id=${id}
          class="handle ${id} overflow"
          cx=${this._rArc*pos.x}
          cy=${this._rArc*pos.y}
          r=${2*this.handleSize}
          style="fill: rgba(0,0,0,0);"
        ></circle>
        <circle
          id=${id}
          class="handle ${id}"
          cx=${this._rArc*pos.x}
          cy=${this._rArc*pos.y}
          r=${this.handleSize}
        ></circle>
      `
  };

  render() {
    let up, down, left, right;
    ({up, down, left, right} = this._getBoundaries());

    return html`
      <svg
      @mousedown=${this.dragStart}
      @touchstart=${this.dragStart}
        xmln="http://www.w3.org/2000/svg"
        viewBox="${-left} ${-up} ${left+right} ${up+down}"
      >
        <g class="slider">
          <path
            class="path"
            d=${this._renderArc(this._start, this._end, this._rArc)}
          />
          ${ this._isDisabled
            ? ''
            : svg`
          <path
            class="bar"
            d=${this._renderArc(
              this._start+this._len*(this.low !== undefined
                ? this._valueFrac("low")
                : 0
              ),
              this._start+this._len*((this.high !== undefined)
                ? this._valueFrac("high")
                : this._valueFrac("value")
              ),
            this._rArc)}
          />
          `}
        </g>

        ${ this._isDisabled
          ? ''
          : svg`
          <g class="handles">
          ${ this.low !== undefined
            ? this._reverseOrder
              ? html`${this._renderHandle("high")} ${this._renderHandle("low")}`
              : html`${this._renderHandle("low")} ${this._renderHandle("high")}`
            : html`${this._renderHandle("value")}`
          }
          </g>
          `}
      </svg>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: inline-block;
        width: 100%;
      }
      .slider {
        fill: none;
        stroke-width: var(--round-slider-path-width, 3);
        stroke-linecap: var(--round-slider-linecap, round);
      }
      .path {
        stroke: var(--round-slider-path-color, lightgray);
      }
      .bar {
        stroke: var(--round-slider-bar-color, deepskyblue);
      }
      .handles {
        fill: var(--round-slider-handle-color, var(--round-slider-bar-color, deepskyblue));
      }
      .handles .low {
        fill: var(--round-slider-low-handle-color);
      }
      .handles .high {
        fill: var(--round-slider-high-handle-color);
      }
    `;
  }

}

customElements.define('round-slider2', RoundSlider);
