import type { CivicIssue } from "../types/civic";

const now = Date.now();
const hour = 60 * 60 * 1000;

export const SEED_ISSUES: CivicIssue[] = [
  {
    id: "CR-2026-1041",
    title: "Leaning Streetlight Pole with Exposed Live Wires",
    description:
      "A metallic streetlight pole along LB Road has bent sharply toward the carriageway with severed electrical cables dangling at eye level above two-wheeler riders and pedestrians.",
    location: "LB Road near Adyar Depot, Adyar, Chennai 600020",
    category: "Streetlights & Electricity",
    categoryOverridden: false,
    priority: "Critical",
    recommendedDepartment: "Electrical & Street Lighting",
    officialSummary:
      "Structurally compromised streetlight pole on LB Road near Adyar Depot requires immediate power isolation and emergency pole replacement due to exposed dangling wiring.",
    priorityReasoning:
      "Assigned Critical priority because exposed electrical cabling over an active urban roadway presents an immediate electrocution and collision hazard, especially after dusk.",
    visualAnalysis:
      "Image confirms a severely tilted galvanized steel lamp post with a fractured luminaire head, loose hanging dark conductors, and active evening pedestrian and motorcycle traffic beneath.",
    risk_factors: [
      "Electrocution hazard from dangling conductors",
      "Imminent pole collapse onto traffic lane",
      "Severe night visibility blackout",
    ],
    sla_hours: 4,
    status: "Reported",
    upvotes: 18,
    imageUrl: "/src/assets/images/chennai_adyar_streetlight_1795237572268.webp",
    afterImageUrl: null,
    resolvedVerified: false,
    createdAt: new Date(now - 1.5 * hour).toISOString(),
    updatedAt: new Date(now - 1.5 * hour).toISOString(),
  },
  {
    id: "CR-2026-1040",
    title: "Major Intersection Traffic Signal Outage During Peak Hours",
    description:
      "All traffic signal heads at the Sholinganallur IT corridor junction on OMR have gone completely dark, forcing manual traffic control amid heavy bus and commuter vehicle flow.",
    location: "Sholinganallur Junction, OMR, Chennai 600119",
    category: "Traffic & Public Safety",
    categoryOverridden: false,
    priority: "Critical",
    recommendedDepartment: "Traffic & Enforcement",
    officialSummary:
      "Signalized intersection controller failure at Sholinganallur Junction on OMR requires urgent electrical restoration and temporary traffic marshals.",
    priorityReasoning:
      "Assigned Critical priority due to high-speed multi-lane commuter traffic, heavy public buses, and pedestrian crosswalk exposure with unlit signal heads.",
    visualAnalysis:
      "Image shows completely unlit signal aspects on the primary intersection mast, tangled overhead cabling, and a single traffic officer manually directing crossing auto-rickshaws and motorcycles.",
    risk_factors: [
      "High-speed T-bone collision risk at 4-way junction",
      "Unprotected pedestrian crosswalk exposure",
      "Severe arterial gridlock on IT corridor",
    ],
    sla_hours: 4,
    status: "In Progress",
    upvotes: 24,
    imageUrl: "/src/assets/images/chennai_omr_traffic_signal_1795237573701.webp",
    afterImageUrl: null,
    resolvedVerified: false,
    createdAt: new Date(now - 4 * hour).toISOString(),
    updatedAt: new Date(now - 2 * hour).toISOString(),
  },
  {
    id: "CR-2026-1039",
    title: "Deep Waterlogged Asphalt Crater Blocking Left Lane",
    description:
      "A wide, submerged pothole spanning nearly half the curb-side lane has formed near Anna Nagar 2nd Avenue, obscuring depth from approaching two-wheelers and auto-rickshaws.",
    location: "2nd Avenue near Roundtana, Anna Nagar, Chennai 600040",
    category: "Roads & Potholes",
    categoryOverridden: false,
    priority: "High",
    recommendedDepartment: "Public Works & Roads Dept",
    officialSummary:
      "Deep water-filled road cavity on Anna Nagar 2nd Avenue requires immediate barricading, dewatering, and hot-mix asphalt patching.",
    priorityReasoning:
      "Assigned High priority because standing murky water hides the sharp fractured asphalt rim and depth, creating high skid and axle-damage risk for motorcycles.",
    visualAnalysis:
      "Image depicts a large jagged asphalt failure filled with turbid rainwater along a commercial street with active two-wheeler traffic and roadside storefronts nearby.",
    risk_factors: [
      "Concealed crater depth causes two-wheeler skids",
      "Sudden lane swerving into adjacent traffic",
    ],
    sla_hours: 12,
    status: "In Progress",
    upvotes: 11,
    imageUrl: "/src/assets/images/chennai_anna_nagar_pothole_1795237570941.webp",
    afterImageUrl: null,
    resolvedVerified: false,
    createdAt: new Date(now - 11 * hour).toISOString(),
    updatedAt: new Date(now - 5 * hour).toISOString(),
  },
  {
    id: "CR-2026-1038",
    title: "Clogged Stormwater Grate Causing Street Edge Flooding",
    description:
      "Organic debris and plastic litter have completely sealed the roadside stormwater catch basin on Velachery Bypass Road, leaving stagnant runoff across the lane edge.",
    location: "100 Feet Bypass Road, Velachery, Chennai 600042",
    category: "Water Supply & Drainage",
    categoryOverridden: false,
    priority: "Medium",
    recommendedDepartment: "Water Supply & Sewerage Board",
    officialSummary:
      "Blocked concrete stormwater drain grate along Velachery 100 Feet Bypass Road requires desilting and debris clearance to restore surface runoff flow.",
    priorityReasoning:
      "Assigned Medium priority as localized surface ponding currently leaves the main carriageway passable, though upcoming rainfall could escalate residential flooding.",
    visualAnalysis:
      "Image shows a raised concrete catch-basin grate densely packed with wet leaves and plastic bags, surrounded by pooling grey water along a residential compound wall.",
    risk_factors: [
      "Localized monsoon waterlogging risk",
      "Mosquito breeding in stagnant runoff",
    ],
    sla_hours: 36,
    status: "Reported",
    upvotes: 7,
    imageUrl: "/src/assets/images/chennai_velachery_drainage_1795237572585.webp",
    afterImageUrl: null,
    resolvedVerified: false,
    createdAt: new Date(now - 18 * hour).toISOString(),
    updatedAt: new Date(now - 18 * hour).toISOString(),
  },
  {
    id: "CR-2026-1037",
    title: "Overflowing GCC Waste Compactor Bin on Pedestrian Sidewalk",
    description:
      "Municipal waste container near Usman Road has exceeded capacity with spilled refuse bags obstructing pedestrian walkway access outside retail shops.",
    location: "Usman Road Commercial Corridor, T. Nagar, Chennai 600017",
    category: "Sanitation & Garbage",
    categoryOverridden: false,
    priority: "Low",
    recommendedDepartment: "Solid Waste Management",
    officialSummary:
      "Overflowing roadside waste container on Usman Road cleared and sidewalk swept following scheduled commercial-corridor compactor dispatch.",
    priorityReasoning:
      "Assigned Low priority following immediate containment criteria; poses sanitation nuisance and walkway obstruction without structural or electrical danger.",
    visualAnalysis:
      "Image documents a green municipal dumpster overflowing with tied black and blue refuse bags spilling onto the concrete pavement beside active shopfronts.",
    risk_factors: [
      "Pedestrian footpath obstruction",
      "Sanitation odor and stray animal scavenging",
    ],
    sla_hours: 48,
    status: "Resolved",
    upvotes: 5,
    imageUrl: "/src/assets/images/chennai_tnagar_garbage_1795237571640.webp",
    afterImageUrl: null,
    resolvedVerified: false,
    createdAt: new Date(now - 38 * hour).toISOString(),
    updatedAt: new Date(now - 7 * hour).toISOString(),
  },
];

export const DEMO_SAMPLE_REPORT = {
  title: "Collapsed Roadside Drainage Slab & Broken Asphalt Next to Crosswalk",
  location: "Luz Church Road, Mylapore, Chennai 600004",
  description:
    "Concrete stormwater slab along the road edge has completely caved in right beside a busy pedestrian zebra crossing. Exposed broken concrete chunks and stagnant water seepage are forcing pedestrians into moving two-wheeler traffic.",
  sampleImageUrl: "/src/assets/images/chennai_demo_sample_road_1795237573838.webp",
};
