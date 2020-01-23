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
      startAngle: {type: Number},
      arcLength: {type: Number},
      handleSize: {type: Number},
      handleZoom: {type: Number},
      disabled: {type: Boolean},
      dragging: {type: Boolean, reflect: true},
      rtl: {type: Boolean},
      _scale: {type: Number},
    }
  }

  constructor() {
    super();
    this.min = 0;
    this.max = 100;
    this.step = 1;
    this.startAngle = 135;
    this.arcLength = 270;
    this.handleSize = 6;
    this.handleZoom = 1.5;
    this.disabled = false;
    this.dragging = false;
    this.rtl = false;
    this._scale = 1;
  }

  get _start() {
    return this.startAngle * Math.PI / 180;
  }

  get _len() {
    // Things get weird if length is more than a complete turn
    return Math.min(this.arcLength * Math.PI / 180, 2 * Math.PI - 0.01);
  }

  get _end() {
    return this._start + this._len;
  }

  get _enabled() {
    // If handle is disabled
    if(this.disabled) return false;
    if(this.value == null && (this.high == null || this.low == null)) return false;

    if(this.value != null && (this.value > this.max || this.value < this.min)) return false;
    if(this.high != null && (this.high > this.max || this.high < this.min)) return false;
    if(this.low != null && (this.low > this.max || this.low < this.min)) return false;
    return true;
  }

  _angleInside(angle) {
    // Check if an angle is on the arc
    let a = (this.startAngle + this.arcLength / 2 - angle + 180 + 360) % 360 - 180;
    return (a < this.arcLength / 2 && a > - this.arcLength / 2);
  }

  _angle2xy(angle) {
    if(this.rtl)
      return {x: - Math.cos(angle), y: Math.sin(angle)};
    return {x: Math.cos(angle), y: Math.sin(angle)};
  }

  _xy2angle(x, y) {
    if(this.rtl)
      x = - x;
    return (Math.atan2(y, x) - this._start + 2 * Math.PI) % (2 * Math.PI);
  }

  _value2angle(value) {
    const fraction = (value - this.min) / (this.max - this.min);
    return this._start + fraction * this._len;
  }

  _angle2value(angle) {
    return Math.round((angle / this._len * (this.max - this.min) + this.min) / this.step) * this.step;
  }

  _mouse2value(ev) {
    const mouseX = (ev.type === "touchmove") ? ev.touches[0].clientX : ev.clientX;
    const mouseY = (ev.type === "touchmove") ? ev.touches[0].clientY : ev.clientY;

    const rect = this.shadowRoot.querySelector("svg").getBoundingClientRect();
    const boundaries = this._boundaries;
    const x = mouseX - (rect.left + boundaries.left * rect.width / boundaries.width);
    const y = mouseY - (rect.top + boundaries.up * rect.height / boundaries.height);

    const angle = this._xy2angle(x, y);
    return this._angle2value(angle);
  }

  get _boundaries() {
    // Get the maximum extents of the bar arc
    const start = this._angle2xy(this._start);
    const end = this._angle2xy(this._end);

    let up = 1;
    if(! this._angleInside(270))
      up = Math.max(- start.y, - end.y);

    let down = 1;
    if(! this._angleInside(90))
      down = Math.max(start.y, end.y);

    let left = 1;
    if(! this._angleInside(180))
      left = Math.max(- start.x, - end.x);

    let right = 1;
    if(! this._angleInside(0))
      right = Math.max(start.x, end.x);

    return {
      up, down, left, right,
      height: up + down,
      width: left + right,
    };
  }

  dragStart(ev) {
    let handle = ev.target;

    // Avoid double events mouseDown->focus
    if(this._rotation && this._rotation.type !== "focus") return;

    // Move handle to position of click on shadow-path then switch to handle.
    if(handle.classList.contains("shadow-path")) {
      let pos = this._mouse2value(ev);

      // Oddities with large shadow-path, mouse value ends up above 130 when
      // clicked in whitespace before start and over 100 after the end.
      if(pos >= 130)
        pos = 0;

      if(pos > 100)
        pos = 100;

      if(this.low != null) {
        if(pos >= (this["high"] - this["low"]) / 2 + this["low"]) {
          handle = this.shadowRoot.getElementById("high");
        } else {
          handle = this.shadowRoot.getElementById("low");
        }
      } else {
        handle = this.shadowRoot.getElementById("value");
      }

      this.moveHandle(handle, pos);
    }

    // If an invisible handle was clicked, switch to the visible counterpart
    if(handle.classList.contains("overflow"))
      handle = handle.nextElementSibling;

    if(! handle.classList.contains("handle")) return;
    handle.setAttribute('stroke-width', 2 * this.handleSize * this.handleZoom * this._scale);

    const min = handle.id === "high" ? this.low : this.min;
    const max = handle.id === "low" ? this.high : this.max;
    this._rotation = {handle, min, max, start: this[handle.id], type: ev.type};
    this.dragging = true;
  }

  dragEnd(ev) {
    if(! this._rotation) return;

    const handle = this._rotation.handle;
    handle.setAttribute('stroke-width', 2 * this.handleSize * this._scale);

    this._rotation = false;
    this.dragging = false;

    handle.blur();

    let event = new CustomEvent('value-changed', {
      detail: {
        [handle.id]: this[handle.id],
      }
    });
    this.dispatchEvent(event);

    // This makes the low handle render over the high handle if they both are
    // close to the top end.  Otherwise if would be unclickable, and the high
    // handle locked by the low.  Calcualtion is done in the dragEnd handler to
    // avoid "z fighting" while dragging.
    if(this.low && this.low >= 0.99 * this.max)
      this._reverseOrder = true;
    else
      this._reverseOrder = false;
  }

  drag(ev) {
    if(! this._rotation) return;
    if(this._rotation.type === "focus") return;

    ev.preventDefault();

    const pos = this._mouse2value(ev);
    this._dragpos(pos);
  }

  _dragpos(pos) {
    if(pos < this._rotation.min || pos > this._rotation.max) return;

    const handle = this._rotation.handle;
    this.moveHandle(handle, pos);
  }

  moveHandle(handle, pos) {
    this[handle.id] = pos;
    handle.as = pos;

    let event = new CustomEvent('value-changing', {
      detail: {
        [handle.id]: pos,
      }
    });
    this.dispatchEvent(event);
  }

  _keyStep(ev) {
    if(! this._rotation) return;
    const handle = this._rotation.handle;
    if(ev.key === "ArrowLeft")
      if(this.rtl)
        this._dragpos(this[handle.id] + this.step);
      else
        this._dragpos(this[handle.id] - this.step);
    if(ev.key === "ArrowRight")
      if(this.rtl)
        this._dragpos(this[handle.id] - this.step);
      else
        this._dragpos(this[handle.id] + this.step);
  }

  firstUpdated() {
    document.addEventListener('mouseup', this.dragEnd.bind(this));
    document.addEventListener('touchend', this.dragEnd.bind(this), {passive: false});
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('touchmove', this.drag.bind(this), {passive: false});
    document.addEventListener('keydown', this._keyStep.bind(this));
  }

  updated(changedProperties) {
    // Workaround for vector-effect not working in IE and pre-Chromium Edge
    // That's also why the _scale property exists
    if(this.shadowRoot.querySelector("svg")
      && this.shadowRoot.querySelector("svg").style.vectorEffect !== undefined)
      return;

    if(changedProperties.has("_scale") && this._scale != 1) {
      this.shadowRoot.querySelector("svg").querySelectorAll("path").forEach((e) => {
        if(e.getAttribute('stroke-width')) return;
        const orig = parseFloat(getComputedStyle(e).getPropertyValue('stroke-width'));
        e.style.strokeWidth = `${orig * this._scale}px`;
      });
    }
    const rect = this.shadowRoot.querySelector("svg").getBoundingClientRect();
    const scale = Math.max(rect.width, rect.height);
    this._scale = 2 / scale;
  }

  _renderArc(start, end) {
    const diff = end - start;
    start = this._angle2xy(start);
    end = this._angle2xy(end + 0.001); // Safari doesn't like arcs with no length
    return `
      M ${start.x} ${start.y}
      A 1 1,
        0,
        ${(diff) > Math.PI ? "1" : "0"} ${this.rtl ? "0" : "1"},
        ${end.x} ${end.y}
    `;
  }

  _renderHandle(id) {
    const theta = this._value2angle(this[id]);
    const pos = this._angle2xy(theta);

    // Two handles are drawn. One visible, and one invisible that's twice as
    // big. Makes it easier to click.
    return svg`
      <g class="${id} handle">
        <path
          id=${id}
          class="overflow"
          d="
          M ${pos.x} ${pos.y}
          L ${pos.x + 0.001} ${pos.y + 0.001}
          "
          vector-effect="non-scaling-stroke"
          stroke="rgba(0,0,0,0)"
          stroke-width="${4 * this.handleSize * this._scale}"
          />
        <path
          id=${id}
          class="handle"
          d="
          M ${pos.x} ${pos.y}
          L ${pos.x + 0.001} ${pos.y + 0.001}
          "
          vector-effect="non-scaling-stroke"
          stroke-width="${2 * this.handleSize * this._scale}"
          tabindex="0"
          @focus=${this.dragStart}
          @blur=${this.dragEnd}
          />
        </g>
      `
  };

  render() {
    const view = this._boundaries;

    return html`
      <svg
        @mousedown=${this.dragStart}
        @touchstart=${this.dragStart}
        xmln="http://www.w3.org/2000/svg"
        viewBox="${- view.left} ${- view.up} ${view.width} ${view.height}"
        style="margin: ${this.handleSize * this.handleZoom}px;"
        focusable="false"
      >
        <g class="slider">
          <path
            class="path"
            d=${this._renderArc(this._start, this._end)}
            vector-effect="non-scaling-stroke"
          />
          ${this._enabled
      ? svg`
              <path
                class="bar"
                vector-effect="non-scaling-stroke"
                d=${this._renderArc(
        this._value2angle(this.low != null ? this.low : this.min),
        this._value2angle(this.high != null ? this.high : this.value)
      )}
              />`
      : ``
      }
          
          <path 
            class="shadow-path"
            d=${this._renderArc(this._start, this._end)}
            vector-effect="non-scaling-stroke"
           />
           
        </g>
        
        <g class="handles">
        ${this._enabled
      ? this.low != null
        ? this._reverseOrder
          ? html`${this._renderHandle("high")} ${this._renderHandle("low")}`
          : html`${this._renderHandle("low")} ${this._renderHandle("high")}`
        : html`${this._renderHandle("value")}`
      : ``
      }
        </g>
      </svg>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: inline-block;
        width: 100%;
      }
      svg {
        overflow: visible;
      }
      .slider {
        fill: none;
        stroke-width: var(--round-slider-path-width, 3);
        stroke-linecap: var(--round-slider-linecap, round);
      }
      .shadow-path {
        cursor: pointer;
        opacity: 0;
        stroke: red;
        stroke-width: var(--round-slider-click-area, 30);
      }
      .path {
        stroke: var(--round-slider-path-color, lightgray);
        stroke-width: var(--round-slider-path-width, 3);
      }
      .bar {
        stroke: var(--round-slider-bar-color, deepskyblue);
      }
      g.handles {
        stroke: var(--round-slider-handle-color, var(--round-slider-bar-color, deepskyblue));
        stroke-linecap: round;
      }
      g.low.handle {
        stroke: var(--round-slider-low-handle-color);
      }
      g.high.handle {
        stroke: var(--round-slider-high-handle-color);
      }
      .handle {
        transition: stroke-width 200ms ease-out;
      }
      .handle:hover {
        cursor: pointer;
      }
      .handle:focus {
        outline: unset;
      }
    `;
  }
}

customElements.define('round-slider', RoundSlider);
