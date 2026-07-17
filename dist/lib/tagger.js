const TAG_RULES = [
    { tag: "AI", keywords: ["artificial intelligence", " ai ", "autonomous", "machine learning"] },
    { tag: "Imaging", keywords: ["imaging", "scan", "radiology", "medical imaging"] },
    { tag: "Oncology", keywords: ["oncology", "cancer"] },
    { tag: "Drug Discovery", keywords: ["drug discovery", "therapies", "therapeutic", "techbio"] },
    { tag: "Diagnostics", keywords: ["diagnostic", "biomarker", "measure", "testing"] },
    { tag: "Digital Health", keywords: ["digital health", "digital therapeutics", "digital technology"] },
    { tag: "Mental Health", keywords: ["mental health", "psychiatrist", "psychological"] },
    { tag: "Transplant", keywords: ["organ", "transplant"] },
    { tag: "Biotech", keywords: ["biotech", "bioprinting", "regenerative medicine", "tissue"] },
    { tag: "Wearables", keywords: ["wearable", "microwearable", "sensor", "skin"] },
    { tag: "Policy", keywords: ["policy", "ethical", "responsible ai"] },
    { tag: "Data", keywords: ["real-world data", "real-world evidence", "data"] },
    { tag: "Preventive Care", keywords: ["prevent", "proactive", "prevention"] },
    { tag: "Personalized Medicine", keywords: ["personalized", "precision medicine"] }
];
export function deriveTags(...parts) {
    const text = ` ${parts.join(" ").toLowerCase()} `;
    const tags = new Set(["Healthcare"]);
    for (const rule of TAG_RULES) {
        if (rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
            tags.add(rule.tag);
        }
    }
    if (text.includes("founder") || text.includes("co-founder") || text.includes("ceo")) {
        tags.add("Founders");
    }
    return [...tags].sort((left, right) => left.localeCompare(right));
}
export function normalizeTags(tags) {
    const normalized = new Set();
    for (const rawTag of tags) {
        const tag = rawTag.trim();
        if (!tag) {
            continue;
        }
        normalized.add(tag
            .split(/\s+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" "));
    }
    return [...normalized].sort((left, right) => left.localeCompare(right));
}
