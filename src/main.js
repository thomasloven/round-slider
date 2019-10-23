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
      radius: {type: Number}, // Undocumented, not recommended
      startAngle: {type: Number},
      arcLength: {type: Number},
      handleSize: {type: Number},
      handleZoom: {type: Number},
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
    this.handleZoom = 1.5;
    this.disabled = false;
    this.dragging = false;
    this.rtl = false;
  }

  get _r0() {
    // The radius of the circle prescribed by the outermost edge of the handle
    // Depends on the width of the element

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

    // Setting radius overrides everything.
    // It's not recommended.
    // Set the element width instead - that will look much better
    if (this.radius)
      this.style.width = `${this.radius*(left+right)}px`;
    return this.clientWidth/(left+right);
  }
  get _rArc() {
    return this._r0 - this.handleSize*this.handleZoom;
  }
  get _start() {
    return this.startAngle*Math.PI/180;
  }
  get _len() {
    // Things get weird if length is more than a complete turn
    return Math.min(this.arcLength*Math.PI/180, 2*Math.PI-0.01);
  }
  get _end() {
    return this._start + this._len;
  }

  get _enabled() {
    // If handle is disabled
    return !(this.disabled || (this.value === undefined && this.high === undefined && this.low === undefined));
  }

  _angleInside(angle) {
    // Check if an angle is on the arc
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

  _value2angle(value) {
    const fraction = (value - this.min)/(this.max - this.min);
    return this._start + fraction * this._len;
  }
  _angle2value(angle) {
    return Math.round((angle/this._len*(this.max - this.min) + this.min)/this.step)*this.step;
  }


  get _boundaries() {
    // Get the left, right, top and bottom extremes of the arc
    const start = this._angle2xy(this._start);
    const end = this._angle2xy(this._end);
    const margin = this.handleSize*this.handleZoom;

    let up = 1;
    if(!this._angleInside(270))
      up =  Math.max(-start.y, -end.y);
    up = this._rArc*up + margin;

    let down = 1;
    if(!this._angleInside(90))
      down = Math.max(start.y, end.y);
    down = this._rArc*down + margin;

    let left = 1;
    if(!this._angleInside(180))
      left = Math.max(-start.x, -end.x);
    left = this._rArc*left + margin;

    let right = 1;
    if(!this._angleInside(0))
      right = Math.max(start.x, end.x);
    right = this._rArc*right + margin;

    return { up, down, left, right };
  }

  dragStart(ev) {
    if(!ev.target.classList.contains("handle")) return;

    let handle = ev.target;
    // If an invisible handle was clicked, switch to the visible counterpart
    if(handle.classList.contains("overflow"))
      handle = handle.nextElementSibling
    handle.setAttribute('r', this.handleSize*this.handleZoom);

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

    // This makes the low handle render over the high handle if they both are
    // close to the top end.  Otherwise if would be unclickable, and the high
    // handle locked by the low.  Calcualtion is done in the dragEnd handler to
    // avoid "z fighting" while dragging.
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
    const boundaries = this._boundaries;
    const x = mouseX - (rect.x + boundaries.left);
    const y = mouseY - (rect.y + boundaries.up);

    const angle = this._xy2angle(x,y);
    const pos = this._angle2value(angle);
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
    this.addEventListener('resize', () => console.log("Resize"));
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

  _renderHandle(id) {
    const theta = this._value2angle(this[id]);
    const pos = this._angle2xy(theta);

    // Two handles are drawn. One visible, and one invisible that's twice as
    // big. Makes it easier to click.
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
    const view = this._boundaries;

    return html`
      <svg
      @mousedown=${this.dragStart}
      @touchstart=${this.dragStart}
        xmln="http://www.w3.org/2000/svg"
        viewBox="${-view.left} ${-view.up} ${view.left + view.right} ${view.up + view.down}"
      >
        <g class="slider">
          <path
            class="path"
            d=${this._renderArc(this._start, this._end, this._rArc)}
          />
          ${ this._enabled
            ? svg`
              <path
                class="bar"
                d=${this._renderArc(
                  this._value2angle(this.low !== undefined ? this.low : this.min),
                  this._value2angle(this.high !== undefined ? this.high : this.value),
                  this._rArc)}
              />`
            : ``
          }
        </g>

        ${ this._enabled
          ? svg`
            <g class="handles">
            ${ this.low !== undefined
                ? this._reverseOrder
                ? html`${this._renderHandle("high")} ${this._renderHandle("low")}`
                : html`${this._renderHandle("low")} ${this._renderHandle("high")}`
                : html`${this._renderHandle("value")}`
            }
            </g>`
          : ``
        }
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

customElements.define('round-slider', RoundSlider);
