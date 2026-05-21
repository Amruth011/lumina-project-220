export interface RoadmapTask {
  id: string;
  title: string;
  estimated_hours: number;
  is_completed: boolean;
  /** Pre-formatted Antigravity verification prompt the user can paste back to evaluate their work */
  verification_prompt?: string;
}

export interface RoadmapItem {
  phase_number: number;
  phase_title: string;
  focus_area: string;
  gap_addressed: string;
  actionable_tasks: RoadmapTask[];
  deep_dive_resources: {
    title: string;
    url: string;
    source_type: string;
  }[];
}

export interface RoadmapData {
  target_role: string;
  duration: string;
  skill_gaps_identified: string[];
  timeline: RoadmapItem[];
}
