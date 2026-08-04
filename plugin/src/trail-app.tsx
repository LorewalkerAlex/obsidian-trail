import { useState } from "react";

const TRAIL_PAGES = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "A future overview of important projects and tasks.",
  },
  {
    id: "areas",
    label: "Areas",
    description: "A future view of areas and their projects.",
  },
  {
    id: "project",
    label: "Project",
    description: "A future workspace for one active project.",
  },
  {
    id: "fleeting-notes",
    label: "Fleeting Notes",
    description: "A future space for capturing and processing ideas.",
  },
] as const;

type TrailPageId = (typeof TRAIL_PAGES)[number]["id"];

export function TrailApp() {
  const [activePageId, setActivePageId] =
    useState<TrailPageId>("dashboard");

  const activePage =
    TRAIL_PAGES.find((page) => page.id === activePageId) ??
    TRAIL_PAGES[0];

  return (
    <div className="trail-app">
      <header className="trail-app__header">
        <p className="trail-app__eyebrow">Obsidian plugin POC</p>
        <h1 className="trail-app__title">Trail</h1>
      </header>

      <nav
        className="trail-app__navigation"
        aria-label="Trail pages"
      >
        {TRAIL_PAGES.map((page) => (
          <button
            key={page.id}
            type="button"
            className={
              page.id === activePageId
                ? "trail-app__nav-button is-active"
                : "trail-app__nav-button"
            }
            aria-current={
              page.id === activePageId ? "page" : undefined
            }
            onClick={() => setActivePageId(page.id)}
          >
            {page.label}
          </button>
        ))}
      </nav>

      <main className="trail-app__content">
        <h2>{activePage.label}</h2>
        <p>{activePage.description}</p>
      </main>
    </div>
  );
}
