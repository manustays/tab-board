# Reordering items inside widgets

In **edit mode**, the individual entries inside a list widget — bookmark links,
to-do tasks, snippets — can be dragged to reorder them, and dragged into another
widget of the same type.

## Behaviour

- Drag an item onto another item: it lands **before** that item if the pointer is
  in its first half, **after** it otherwise. A wrapped bookmark icon grid splits
  on X (it reads left-to-right); everything else splits on Y.
- Drag onto the empty area or the "add" row: the item lands at the end. This is
  also how you drop into a widget that has no items yet.
- An accent-coloured caret marks the slot the item will land in.
- Only widgets of the same **kind** accept each other's items: `bookmarks` ↔
  `bookmarks`, `todo` ↔ `todo`, `snippets` ↔ `snippets`. Their item shapes differ
  (`{label,url,ini,color}` vs `{text,done}` vs `{label,body}`), so a cross-kind
  drop would produce a broken item; the drop is refused instead.
- Outside edit mode nothing is draggable, so a click on a bookmark still just
  follows the link.
- The `single` bookmark widget holds one item rather than a list, so it takes no
  part in this.

## Implementation

`src/widgets/dnd.js` holds both halves:

- `moveItem(widgets, fromId, itemId, toId, index)` — pure. Splices the item out
  of the source widget's `items` and into the target's at `index`. A same-widget
  move adjusts for the slot the item just vacated.
- `useItemDnd({kind, widgetId, items, onMoveItem, enabled, accent})` — the hook
  each list widget spreads onto its rows (`rowProps`), its container
  (`zoneProps`), and its row styles (`markStyle`). Native HTML5 drag and drop —
  no library, no pointer-event bookkeeping.

Two constraints shape the design:

1. **The live drag is a module-level variable.** HTML5 forbids reading
   `dataTransfer` during `dragover`, but that is exactly when a target has to
   decide whether it accepts the drop. Everything is in one document, so a
   module variable is the smallest thing that both ends can see.
2. **The move is applied in `app.jsx`, not in the widget.** Each widget renders
   into its own Preact root inside a gridstack cell and only gets `onPatch` for
   itself. A cross-widget move edits two widgets, so it goes through
   `onMoveItem` up to the app's single `setState`.

Gridstack is unaffected: it only starts a widget drag from the `.nt-drag` handle,
and it uses pointer events rather than the HTML5 drag events used here.
