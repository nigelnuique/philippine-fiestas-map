# Map interaction guide

How navigation works in the Philippine Fiestas Map — for users, testers, and developers changing click behavior.

## Navigation paths

You can change the current area via:

| Method | Behavior |
|--------|----------|
| **Map click** | Drill down or switch area (rules below) |
| **Sea click** | Clear selection → country view |
| **Philippines chip** | Reset to country view from any selection |
| **Sidebar chips** | Jump to region, province, municipality, or barangay |
| **Festival card** | Fly to festival location; selects deepest available admin level |

## Map click rules

Implemented in `src/lib/mapInteraction.js` → `selectionFromMapClick()`.

### Municipality or barangay click

Always selects the **deepest** polygon under the cursor (`adm4` barangay > `adm3` municipality).

### Province click

| Current view | Click same region | Click different region |
|--------------|-------------------|------------------------|
| Country (no selection) | → **Region** for that province | → **Region** |
| Region view, same region | → **Province** | → **Region** of clicked province |
| Province or deeper, same region | → **Province** | → **Region** of clicked province |
| Province or deeper, different region | → **Region** of clicked province | → **Region** |

**Rationale:** From country view, clicking a province first zooms to its region. Province outline strokes appear only after you drill to province level or deeper.

### Region click

Always selects the **region** (only relevant when province polygons are clickable without municipality overlay).

## Map appearance by zoom level

At the **country overview** (no selection):

- Provinces are filled by **region color** (`adm1_psgc` → `REGION_COLORS` in `constants.js`)
- **No province outline strokes** — internal province boundaries are hidden so only region color changes divide the map
- Fills use full opacity and `fill-antialias: false` to reduce hairline gaps between adjacent polygons in the same region

At **region** view, province outlines stay hidden for the same reason (one region color, many province polygons). Province, municipality, and barangay **outline layers** turn on from **province** drill-down onward.

Implemented in `FiestaMap.jsx` → `applyHighlight()` (`provinces-line` visibility and fill paint).

## Visual feedback by level

| Level | Province layer | Municipality layer | Barangay layer |
|-------|----------------|--------------------|----------------|
| Country | Region colors only (no province outlines) | Hidden | Hidden |
| Region | Selected region solid; others dimmed (no province outlines) | Visible (all munis in region) | Hidden |
| Province | Host province emphasized; province outlines visible | Visible (province munis) | Hidden |
| Municipality | Province dimmed | Selected muni highlighted | Visible if data exists |
| Barangay | Province dimmed | Host muni highlighted | Selected barangay highlighted |

## Sea click and pan

- **Click** on empty ocean/land (no polygon hit): clears selection
- **Drag** to pan: does not clear (8px movement threshold)
- Cursor shows pointer over interactive polygons

## Sidebar festival list

| Selection level | Festivals shown |
|-----------------|-----------------|
| Country | None — prompt to select a region |
| Region | Festivals tagged to municipalities in that region |
| Province | Festivals tagged to municipalities in that province |
| Municipality | Named festivals for that municipality + barangay fiestas in the municipality |
| Barangay | Barangay fiestas for that barangay + named festivals explicitly tagged to that barangay |

## Festival click → map

When you click a festival card:

1. `selectionFromFestival()` resolves location from festival metadata
2. If barangay boundaries exist for the municipality **and** the festival has a barangay PSGC → **barangay** selection
3. Otherwise → **municipality** selection (or **province** / **region** if municipality unknown)
4. Cities without polygons (e.g. some HUCs) use `mapFocus` center/zoom from `CITY_MAP_FOCUS`

## Sidebar navigation

At country view, the sidebar lists all 17 regions as chips. After drilling down:

- **Philippines** chip (Navigate section) resets to country view
- **Region chips** stay visible; the active region is highlighted
- **Province chips** appear from region level onward
- **Municipality chips** appear from province level onward
- **Barangay chips** appear when the municipality has barangay GeoJSON

Example hierarchy when viewing a barangay:

```
Philippines → Region VII – Central Visayas → Cebu → Mandaue City → Subangdaku
```

Use chips to jump sideways or up one level; use the Philippines chip to return to the overview.

## Testing checklist

Use this when verifying map behavior after changes:

- [ ] Country overview shows region colors only (no province grid lines)
- [ ] Country → click province → lands on region with muni grid
- [ ] Region → click province chip → province view with munis
- [ ] Region → click municipality on map → municipality view
- [ ] Municipality with barangays → click barangay → barangay highlight
- [ ] HUC city (Cebu City, Mandaue, Makati) → barangay fiestas appear in sidebar when municipality selected
- [ ] Click sea → clears to country
- [ ] Drag map → does not clear selection
- [ ] Rapid clicks between areas → no stale highlight or wrong camera
- [ ] Festival click → flies to correct area
- [ ] Philippines chip resets to country view from any level
- [ ] Sidebar province/municipality/barangay chips visible at the right levels

## Changing click behavior

Edit `selectionFromMapClick()` in `src/lib/mapInteraction.js`. The function receives:

- `feature` — deepest GeoJSON feature under cursor
- `manifest` — boundary manifest (region/province names)
- `currentSelection` — current app selection or `null`

Return a selection object (see [architecture.md](architecture.md#selection-model)) or `null`.

After changes, run through the testing checklist above.
