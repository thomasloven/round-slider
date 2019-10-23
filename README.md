# round-slider

A simple round slider webcomponent - [demo](https://rawcdn.githack.com/thomasloven/round-slider/master/example.html)

![single](https://user-images.githubusercontent.com/1299821/64284907-e48d9100-cf5a-11e9-99ed-07afbfb1eada.png)

## Properties


- `value` - Required for single slider
- `low` - Required for high/low slider
- `high` - Required for high/low slider

- `min` - Lower limit of values
- `max` - Higher limit of values
- `step` - Step size of slider

- `startAngle` - Angle in degrees at which slider bar starts (default: 135)
- `arcLength` - Length in degrees of slider bar (default: 270)

- `handleSize` - Radius of handle in pixels (default: 6)
- `disabled` - Boolean property disabling the slider (default: false)
- `rtl` - Boolean property to have the slider move Right to Left (default: false)


## Events

The slider dispatches two events

- `value-changing` when the value is changed but the mouse button is still pressed
- `value-changed` on release of mouse button

Both events pass an object as `detail` with either `value`, `low`, or `high` set to the new value depending on which slider was pulled.

## CSS styles

The following css variables can be used to change the styles:

- `--round-slider-path-color` - color of bar path
- `--round-slider-bar-color` - color of bar
- `--round-slider-handle-color` - color of handles
- `--round-slider-low-handle-color` - color of low handle (overrides `--round-slider-handle-color`)
- `--round-slider-high-handle-color` - color of high handle (overrides `--round-slider-handle-color`)
- `--round-slider-path-width` - bar width in pixels (default: 3)
- `--round-slider-linecap` - svg linecaps of bar (default: `round`)

## Examples
See [example.html](https://rawcdn.githack.com/thomasloven/round-slider/master/example.html) for usage examples.
![Examples](https://user-images.githubusercontent.com/1299821/64284861-c9bb1c80-cf5a-11e9-830f-11951f84596d.png)
