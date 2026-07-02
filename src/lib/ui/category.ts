/** Map a listing property type to a category pin colour (matches CSS pins). */
export function categoryColor(propertyType: string | null): string {
  const t = (propertyType ?? "").toLowerCase();
  if (t.includes("studio")) return "#ff8a3d"; // orange
  if (t.includes("apartment") || t.includes("flat")) return "#ffb020"; // amber
  if (t.includes("townhouse") || t.includes("terraced")) return "#21c17a"; // green
  if (t.includes("house") || t.includes("detached")) return "#2f6bff"; // blue
  if (t.includes("semi")) return "#ff5a5f"; // red
  return "#8a4dff"; // other
}
