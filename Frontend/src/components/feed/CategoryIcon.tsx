/*
  CategoryIcon - a small icon per category, used in the category chips, the
  Filters sheet rows and the listing-card image placeholder.

  Categories come from the database, so we match on name keywords and fall
  back to a tag icon for anything unmapped. Uses Phosphor (regular weight by
  default; pass weight="fill" for a selected state) like the rest of the app.

  Owner: Joshua Reid Adams (230317693)
*/

import {
  Armchair,
  BookOpen,
  Cpu,
  PencilSimple,
  Tag,
  TShirt,
  Wrench,
  type IconWeight,
} from "@phosphor-icons/react";

type CategoryIconProps = {
  name: string;
  className?: string;
  weight?: IconWeight;
};

export function CategoryIcon({
  name,
  className = "size-4",
  weight = "regular",
}: CategoryIconProps) {
  const n = name.toLowerCase();
  const props = { className, weight, "aria-hidden": true } as const;

  if (n.includes("text") || n.includes("book") || n.includes("study"))
    return <BookOpen {...props} />;
  if (
    n.includes("electron") ||
    n.includes("device") ||
    n.includes("laptop") ||
    n.includes("phone")
  )
    return <Cpu {...props} />;
  if (n.includes("cloth") || n.includes("fashion") || n.includes("apparel"))
    return <TShirt {...props} />;
  if (n.includes("service") || n.includes("repair"))
    return <Wrench {...props} />;
  if (
    n.includes("furnitur") ||
    n.includes("desk") ||
    n.includes("chair") ||
    n.includes("room")
  )
    return <Armchair {...props} />;
  if (n.includes("station") || n.includes("pen") || n.includes("note"))
    return <PencilSimple {...props} />;

  // Tag - fallback for any other category
  return <Tag {...props} />;
}
