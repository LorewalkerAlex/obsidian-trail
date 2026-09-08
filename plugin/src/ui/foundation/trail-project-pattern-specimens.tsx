import { TrailEmptyState } from "../patterns/trail-empty-state";
import { TrailGroupHeader } from "../patterns/trail-group-header";
import {
  TrailPageNarrative,
  type TrailMarkdownRender,
} from "../patterns/trail-page-narrative";
import {
  TrailPageBreadcrumbButton,
  TrailPageHeader,
} from "../patterns/trail-page-header";
import { TrailButton } from "../primitives/trail-button";
import { TrailIconButton } from "../primitives/trail-icon-button";
import {
  LabSpecimenRow,
  LabStateGrid,
} from "./trail-lab-showroom";

const renderNarrativeFixture: TrailMarkdownRender = (_markdown, container) => {
  const paragraph = container.ownerDocument.createElement("p");
  paragraph.append("Keep the Initiative focused around ");
  const link = container.ownerDocument.createElement("a");
  link.href = "#";
  link.append("shared context");
  paragraph.append(link, ".");
  container.replaceChildren(paragraph);
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function TrailAddIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" viewBox="0 0 16 16">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function TrailProjectPatternSpecimens() {
  return (
    <>
      <LabSpecimenRow
        description="Shared page identity and action geometry stays visually above collection controls without turning every page into a universal shell. Projects proves the root form; Initiative Alpha proves the same production breadcrumb branch used by scoped Project Pages."
        kind="composition-gallery"
        owner="TrailPageHeader"
        title="Page header"
      >
        <LabStateGrid>
          <div style={{ width: "100%" }}>
            <TrailPageHeader
              actions={(
                <TrailIconButton
                  icon={<TrailAddIcon />}
                  label="Add project"
                />
              )}
              title="Projects"
            />
          </div>
          <div style={{ width: "100%" }}>
            <TrailPageHeader
              actions={(
                <TrailIconButton
                  icon={<TrailAddIcon />}
                  label="Add initiative project"
                />
              )}
              breadcrumb={(
                <TrailPageBreadcrumbButton>
                  Projects
                </TrailPageBreadcrumbButton>
              )}
              title="Initiative Alpha"
            />
          </div>
        </LabStateGrid>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="Initiative and Project descriptions share one lightweight Page narrative owner. Foundation supplies resolved host-rendered fixture content while the production Page injects Obsidian Markdown rendering, so visual rhythm stays shared without a Lab Markdown parser."
        kind="composition-gallery"
        owner="TrailPageNarrative"
        title="Page narrative"
      >
        <div style={{ width: "100%" }}>
          <TrailPageNarrative
            markdown="Keep the Initiative focused around [[shared context]]."
            renderMarkdown={renderNarrativeFixture}
          />
        </div>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="The shared grouped-collection mechanic keeps disclosure, identity navigation, and the visible count as separate responsibilities. Project fixtures cover an entity-backed Initiative group and the non-entity No Initiative label without multiplying every combination."
        kind="state-gallery"
        owner="TrailGroupHeader"
        title="Group header"
      >
        <LabStateGrid>
          <div className="trail-lab-list">
            <TrailGroupHeader
              count={4}
              expanded
              label="Initiative Alpha"
              onExpandedChange={() => { /* static state gallery */ }}
              onIdentityActivate={() => { /* static state gallery */ }}
            />
          </div>
          <div className="trail-lab-list">
            <TrailGroupHeader
              count={0}
              expanded={false}
              label="No Initiative"
              onExpandedChange={() => { /* static state gallery */ }}
            />
          </div>
        </LabStateGrid>
      </LabSpecimenRow>

      <LabSpecimenRow
        description="True-empty and filtered-empty remain Page/Query semantics. The production pattern only provides one hierarchy for Page-supplied title, optional guidance, and recovery action; these two fixtures exercise the materially different content forms without a kind prop."
        kind="state-gallery"
        owner="TrailEmptyState"
        title="Empty state"
      >
        <LabStateGrid>
          <div className="trail-lab-list">
            <TrailEmptyState
              action={<TrailButton variant="primary">New project</TrailButton>}
              description="Create a project to collect durable work under a shared outcome."
              title="No projects yet"
            />
          </div>
          <div className="trail-lab-list">
            <TrailEmptyState
              action={<TrailButton>Clear filters</TrailButton>}
              title="No projects match the filters."
            />
          </div>
        </LabStateGrid>
      </LabSpecimenRow>
    </>
  );
}
