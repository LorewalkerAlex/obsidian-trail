import { describe, expect, it } from "vitest";

import type { TrailSourceIO } from "../ports/trail-source-io";
import { createTrailDomainSourceRepository } from "./trail-domain-source-repository";

function createFixture(initial: string) {
  let markdown = initial;
  const processInputs: string[] = [];
  const sourceIO: TrailSourceIO = {
    async create(_path, content): Promise<void> {
      markdown = content;
    },
    async delete(): Promise<void> {
      markdown = "";
    },
    async list() {
      return [];
    },
    async process(_path, transform): Promise<void> {
      processInputs.push(markdown);
      markdown = transform(markdown);
    },
    async read(): Promise<string> {
      return markdown;
    },
    async rename(): Promise<void> {},
  };
  return {
    getMarkdown: () => markdown,
    processInputs,
    repository: createTrailDomainSourceRepository(sourceIO),
    setMarkdown: (next: string) => {
      markdown = next;
    },
  };
}

describe("DomainSourceRepository", () => {
  it("runs managed transforms against the latest host snapshot and rereads authority", async () => {
    const fixture = createFixture("initial");
    fixture.setMarkdown("external edit");

    const result = await fixture.repository.process(
      "Trail/Collections/Triage.md",
      (latest) => `${latest}\nlocal edit`,
      (_path, markdown) => markdown,
    );

    expect(fixture.processInputs).toEqual(["external edit"]);
    expect(result).toBe("external edit\nlocal edit");
    expect(fixture.getMarkdown()).toBe(result);
  });

  it("authoritatively rereads a newly created source before returning", async () => {
    const fixture = createFixture("");

    const result = await fixture.repository.create(
      "Trail/Projects/0001 Project.md",
      "created",
      (path, markdown) => ({ markdown, path }),
    );

    expect(result).toEqual({
      markdown: "created",
      path: "Trail/Projects/0001 Project.md",
    });
  });
});
