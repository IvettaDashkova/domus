/** Map a listing property type to a category pin colour (matches CSS pins). */
export function categoryColor(propertyType: string | null): string {
  const t = (propertyType ?? "").toLowerCase();
  if (t.includes("detached") && !t.includes("semi")) return "#2f6bff"; // blue
  if (t.includes("semi")) return "#ff5a5f"; // red
  if (t.includes("terraced")) return "#21c17a"; // green
  if (t.includes("flat")) return "#ffb020"; // amber
  return "#ff8a3d"; // orange
}
