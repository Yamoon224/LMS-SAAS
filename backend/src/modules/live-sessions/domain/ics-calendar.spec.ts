import { buildIcsCalendar, escapeIcsText, foldIcsLine, formatIcsUtc } from "./ics-calendar";

const base = {
  uid: "abc-123",
  title: "Atelier",
  startAt: new Date("2026-12-01T10:00:00.000Z"),
  durationMinutes: 90,
  now: new Date("2026-11-18T08:30:15.000Z"),
};

describe("escapeIcsText", () => {
  it("échappe virgules, points-virgules, antislash et retours à la ligne", () => {
    expect(escapeIcsText("a,b;c\\d\ne\r\nf")).toBe("a\\,b\\;c\\\\d\\ne\\nf");
  });

  it("supprime les caractères de contrôle", () => {
    expect(escapeIcsText("a\u0000b\u0007c\u001bd")).toBe("abcd");
  });
});

describe("formatIcsUtc", () => {
  it("formate en UTC sans millisecondes", () => {
    expect(formatIcsUtc(base.startAt)).toBe("20261201T100000Z");
  });
});

describe("foldIcsLine", () => {
  it("laisse une ligne courte intacte", () => {
    expect(foldIcsLine("SUMMARY:court")).toBe("SUMMARY:court");
  });

  it("plie à 75 octets maximum, sans couper un caractère multi-octets", () => {
    const folded = foldIcsLine(`SUMMARY:${"é".repeat(120)}`);
    for (const line of folded.split("\r\n")) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(`SUMMARY:${"é".repeat(120)}`);
  });
});

describe("buildIcsCalendar", () => {
  it("produit un VEVENT conforme avec UID stable, fins de ligne CRLF et rappel", () => {
    const ics = buildIcsCalendar({ ...base, url: "https://meet.example/abc" });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:abc-123@live-sessions\r\n");
    expect(ics).toContain("DTSTAMP:20261118T083015Z\r\n");
    expect(ics).toContain("DTSTART:20261201T100000Z\r\n");
    expect(ics).toContain("DTEND:20261201T113000Z\r\n");
    expect(ics).toContain("SUMMARY:Atelier\r\n");
    expect(ics).toContain("URL:https://meet.example/abc\r\n");
    expect(ics).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Atelier\r\nTRIGGER:-PT15M\r\nEND:VALARM");
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("l'UID est identique à chaque génération (mise à jour du même événement)", () => {
    const a = buildIcsCalendar({ ...base, now: new Date("2026-01-01T00:00:00Z") });
    const b = buildIcsCalendar({ ...base, now: new Date("2027-01-01T00:00:00Z") });
    expect(a.match(/UID:.*/)?.[0]).toBe(b.match(/UID:.*/)?.[0]);
  });

  it("neutralise un titre avec retours à la ligne et virgules (aucune propriété injectée)", () => {
    const ics = buildIcsCalendar({
      ...base,
      title: "Cours, partie 1\r\nATTENDEE:mailto:evil@x.tld\nBEGIN:VALARM",
    });
    expect(ics).toContain("SUMMARY:Cours\\, partie 1\\nATTENDEE:mailto:evil@x.tld\\nBEGIN:VALARM\r\n");
    const lines = ics.split("\r\n");
    expect(lines.filter((line) => line.startsWith("ATTENDEE"))).toHaveLength(0);
    expect(lines.filter((line) => line === "BEGIN:VALARM")).toHaveLength(1);
  });

  it("assainit l'UID et ignore un lien non http(s) ou contenant des caractères de contrôle", () => {
    const ics = buildIcsCalendar({ ...base, uid: "id\r\nX-EVIL:1", url: "javascript:alert(1)" });
    expect(ics).toContain("UID:idX-EVIL1@live-sessions\r\n");
    expect(ics).not.toContain("URL:");
    expect(buildIcsCalendar({ ...base, url: "https://a.b/\r\nX-EVIL:1" })).not.toContain("URL:");
  });

  it("omet le rappel si demandé et borne une durée invalide à 1 minute", () => {
    const ics = buildIcsCalendar({ ...base, reminderMinutes: 0, durationMinutes: -5 });
    expect(ics).not.toContain("VALARM");
    expect(ics).toContain("DTEND:20261201T100100Z");
  });

  it("expose le fuseau valide en X-WR-TIMEZONE et ignore un fuseau invalide ou injecté", () => {
    const base = { uid: "u1", title: "Cours", startAt: new Date("2026-12-01T10:00:00Z"), durationMinutes: 30, now: new Date("2026-11-01T00:00:00Z") };
    expect(buildIcsCalendar({ ...base, timezone: "Africa/Abidjan" })).toContain("X-WR-TIMEZONE:Africa/Abidjan");
    expect(buildIcsCalendar({ ...base, timezone: "Pas/UnFuseau" })).not.toContain("X-WR-TIMEZONE");
    expect(buildIcsCalendar({ ...base, timezone: "UTC\r\nX-EVIL:1" })).not.toContain("X-EVIL");
  });
});
