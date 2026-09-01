import type { TrailLabel } from "../../domain/model/trail-configuration";

const TRAIL_LABEL_COLOR_SLOT_COUNT = 6;

export function trailLabelColorSlot(labelId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < labelId.length; index += 1) {
    hash ^= labelId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % TRAIL_LABEL_COLOR_SLOT_COUNT;
}

export function TrailLabelDots({
  labels,
}: {
  readonly labels: readonly TrailLabel[];
}) {
  if (labels.length === 0) return null;

  const ordered = [...labels].sort((left, right) => {
    const nameOrder = left.name.localeCompare(right.name);
    return nameOrder !== 0 ? nameOrder : left.id.localeCompare(right.id);
  });
  const names = ordered.map((label) => label.name).join(", ");

  return (
    <span
      aria-label={`Labels: ${names}`}
      className="trail-label-dots"
      role="img"
      title={names}
    >
      {ordered.map((label) => (
        <span
          aria-hidden="true"
          className="trail-label-dot"
          data-color-slot={trailLabelColorSlot(label.id)}
          key={label.id}
        />
      ))}
    </span>
  );
}
