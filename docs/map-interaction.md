# Map interaction guide

How navigation works in the Philippine Fiestas Map — for users, testers, and developers changing click behavior.

## Navigation paths

You can change the current area via:

| Method | Behavior |
|--------|----------|
| **Map click** | Drill down or switch area (rules below) |
| **Sea click** | Clear selection → country view |
| **Breadcrumb** | Jump to any ancestor level |
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

**Rationale:** From country view, clicking a province first zooms to its region with municipality boundaries visible. A second click on a province in that region selects the province.

### Region click

Always selects the **region** (only relevant when province polygons are clickable without municipality overlay).

## Visual feedback by level

| Level | Province layer | Municipality layer | Barangay layer |
|-------|----------------|--------------------|----------------|
| Country | Normal opacity | Hidden | Hidden |
| Region | Highlighted region; others dimmed | Visible (all munis in region); thin lines | Hidden |
| Province | Host province emphasized | Visible (province munis) | Hidden |
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

## Breadcrumb

```
Philippines › Region VII – Central Visayas › Cebu › Mandaue City › Subangdaku
```

- Each segment is clickable except the current leaf (and Philippines when already at country view)
- Clicking **Philippines** resets to country view

## Testing checklist

Use this when verifying map behavior after changes:

- [ ] Country → click province → lands on region with muni grid
- [ ] Region → click province chip → province view with munis
- [ ] Region → click municipality on map → municipality view
- [ ] Municipality with barangays → click barangay → barangay highlight
- [ ] HUC city (Cebu City, Mandaue) → municipality polygon visible
- [ ] Click sea → clears to country
- [ ] Drag map → does not clear selection
- [ ] Rapid clicks between areas → no stale highlight or wrong camera
- [ ] Festival click → flies to correct area
- [ ] Breadcrumb back navigation works at each level
- [ ] Sidebar municipality chips visible when at municipality/barangay level

## Changing click behavior

Edit `selectionFromMapClick()` in `src/lib/mapInteraction.js`. The function receives:

- `feature` — deepest GeoJSON feature under cursor
- `manifest` — boundary manifest (region/province names)
- `currentSelection` — current app selection or `null`

Return a selection object (see [architecture.md](architecture.md#selection-model)) or `null`.

After changes, run through the testing checklist above.
