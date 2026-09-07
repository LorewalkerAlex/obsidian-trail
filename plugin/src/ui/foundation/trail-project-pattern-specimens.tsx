import { TrailEmptyState } from "../patterns/trail-empty-state";
import { TrailGroupHeader } from "../patterns/trail-group-header";
import { TrailButton } from "../primitives/trail-button";
import {
  LabSpecimenRow,
  LabStateGrid,
} from "./trail-lab-showroom";

export function TrailProjectPatternSpecimens() {
  return (
    <>
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
