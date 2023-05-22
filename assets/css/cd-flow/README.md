# Flow

## Purpose and Usage
Based on the CubeCSS methodology, this component contains various rules to
control vertical rhythm and horizontal padding.
Use `cd-flow` on parent items to create consistent vertical rhythm on its child
items.
Use `cd-bumper` on parent items to create consistent horizontal spacing of its
children.

CUBE = Composition Utility Block Exception https://cube.fyi
@TODO rename to better include any CubeCSS related rules.
@TODO `cd-bumper` needs real-world validation and testing. Might be dropped and
replaced with component-specific padding rules.

## Caveats
There is currently no mechanism for `cd-bumper` that allows removal or
adjustment based on viewport.

### Variants

```
.cd-flow
.cd-bumper

```
