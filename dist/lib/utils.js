export function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
export function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#96;");
}
export function slugify(value) {
    return value
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
export function uniqueSlug(base, taken) {
    if (!taken.has(base)) {
        return base;
    }
    let index = 2;
    while (taken.has(`${base}-${index}`)) {
        index += 1;
    }
    return `${base}-${index}`;
}
export function formatDate(input) {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
        return input;
    }
    return new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric"
    }).format(parsed);
}
export function toDateString(input) {
    if (!input) {
        return new Date().toISOString().slice(0, 10);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return input;
    }
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }
    return parsed.toISOString().slice(0, 10);
}
export function readJsonScript(json) {
    return JSON.parse(json);
}
export function stripHtml(value) {
    return value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
}
export function stableSortByNumberDesc(items) {
    return [...items].sort((left, right) => right.number - left.number);
}
