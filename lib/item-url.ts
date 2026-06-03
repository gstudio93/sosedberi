const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function getItemIdFromParam(value: string) {
  return value.match(UUID_PATTERN)?.[0] || value;
}

export function getItemUrl(item?: { id?: string | null; name?: string | null }) {
  if (!item?.id) return "/catalog";

  const slug = slugify(item.name || "");

  return slug ? `/item/${item.id}-${slug}` : `/item/${item.id}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/ё/g, "e")
    .replace(/й/g, "y")
    .replace(/ю/g, "yu")
    .replace(/я/g, "ya")
    .replace(/ж/g, "zh")
    .replace(/ч/g, "ch")
    .replace(/ш/g, "sh")
    .replace(/щ/g, "sch")
    .replace(/э/g, "e")
    .replace(/а/g, "a")
    .replace(/б/g, "b")
    .replace(/в/g, "v")
    .replace(/г/g, "g")
    .replace(/д/g, "d")
    .replace(/е/g, "e")
    .replace(/з/g, "z")
    .replace(/и/g, "i")
    .replace(/к/g, "k")
    .replace(/л/g, "l")
    .replace(/м/g, "m")
    .replace(/н/g, "n")
    .replace(/о/g, "o")
    .replace(/п/g, "p")
    .replace(/р/g, "r")
    .replace(/с/g, "s")
    .replace(/т/g, "t")
    .replace(/у/g, "u")
    .replace(/ф/g, "f")
    .replace(/х/g, "h")
    .replace(/ц/g, "c")
    .replace(/ы/g, "y")
    .replace(/ь/g, "")
    .replace(/ъ/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
