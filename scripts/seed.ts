import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  calculateSeverity,
  calculateSlaDueAt,
  generateTicketId,
  Priority,
} from '../src/lib/severity';
import { resolveDepartmentForCategory, Department } from '../src/lib/routing';
import { FactorScores } from '../src/lib/ai/schemas';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface SeedReportDef {
  category: string;
  subType?: string;
  title: string;
  summary: string;
  userText: string;
  baseLat: number;
  baseLng: number;
  address: string;
  factors: FactorScores;
  status: 'submitted' | 'routed' | 'in_progress' | 'resolved';
  reportCount: number;
  daysAgoCreated: number;
  // Resolution details if resolved
  resolvedHoursAfterCreated?: number;
  resolutionReason?: string;
  humanOverride?: boolean;
}

// 8 Known Madurai Localities
const LOCALITIES = {
  meenakshi: { lat: 9.9195, lng: 78.1193, name: 'Meenakshi Temple Area' },
  periyar: { lat: 9.9150, lng: 78.1130, name: 'Periyar Bus Stand' },
  simmakkal: { lat: 9.9260, lng: 78.1200, name: 'Simmakkal' },
  goripalayam: { lat: 9.9400, lng: 78.1330, name: 'Goripalayam' },
  annanagar: { lat: 9.9260, lng: 78.1450, name: 'Anna Nagar' },
  kknagar: { lat: 9.9330, lng: 78.1500, name: 'K. K. Nagar' },
  thirunagar: { lat: 9.8890, lng: 78.0790, name: 'Thirunagar' },
  arapalayam: { lat: 9.9390, lng: 78.1110, name: 'Arapalayam' },
};

// 28 realistic incidents spanning all 10 categories, priority bands, and statuses
const SEED_REPORTS: SeedReportDef[] = [
  // P1 (Critical - 3 tickets)
  {
    category: 'open_manhole_drain',
    subType: 'uncovered_drain',
    title: 'Uncovered deep drainage manhole on main pedestrian concourse',
    summary: 'Open manhole 1.5m deep directly adjacent to busy commuter loading bay with active foot traffic.',
    userText: 'Big open manhole at Periyar bus stand near bay 4, someone will fall inside at night please fix soon.',
    baseLat: LOCALITIES.periyar.lat,
    baseLng: LOCALITIES.periyar.lng,
    address: 'Near Bay 4, Periyar Central Bus Terminal, Madurai',
    factors: {
      safety_risk: 9,
      population_impact: 9,
      urgency_spread: 8,
      sensitive_location: 9,
      reasons: {
        safety_risk: 'High risk of fatal fall or severe fractures for pedestrians',
        population_impact: 'Primary transit hub with thousands of commuters daily',
        urgency_spread: 'Immediate threat during evening peak hours',
        sensitive_location: 'Central bus terminal concourse',
      },
    },
    status: 'in_progress',
    reportCount: 4,
    daysAgoCreated: 0.8,
  },
  {
    category: 'streetlight_electrical',
    subType: 'live_wire_hazard',
    title: 'Live high-voltage power cable snapped and sparking near school gate',
    summary: 'Fallen overhead electricity cable sparking on damp sidewalk in close proximity to school entrance.',
    userText: 'Electric wire hanging and making sparks opposite corporation school, very dangerous for children.',
    baseLat: LOCALITIES.annanagar.lat,
    baseLng: LOCALITIES.annanagar.lng,
    address: 'Opposite Corporation High School, 80 Feet Road, Anna Nagar, Madurai',
    factors: {
      safety_risk: 10,
      population_impact: 8,
      urgency_spread: 9,
      sensitive_location: 9,
      reasons: {
        safety_risk: 'Lethal electrocution hazard from exposed conductor',
        population_impact: 'High student and pedestrian exposure',
        urgency_spread: 'Live electrical arc on wet surface',
        sensitive_location: 'School gate perimeter zone',
      },
    },
    status: 'resolved',
    reportCount: 5,
    daysAgoCreated: 10,
    resolvedHoursAfterCreated: 14, // SLA 24h -> MET
    resolutionReason: 'TNEB emergency squad replaced severed conductor and secured insulated overhead span.',
  },
  {
    category: 'water_leak',
    subType: 'pipe_burst',
    title: 'Major drinking water pipeline burst causing road collapse',
    summary: 'Primary feeder water main rupture flooding intersection and scouring roadway sub-base.',
    userText: 'Massive water gushing out near Goripalayam junction, entire road is sinking and flooded.',
    baseLat: LOCALITIES.goripalayam.lat,
    baseLng: LOCALITIES.goripalayam.lng,
    address: 'Goripalayam Junction, Albert Victor Bridge Approach, Madurai',
    factors: {
      safety_risk: 8,
      population_impact: 9,
      urgency_spread: 9,
      sensitive_location: 8,
      reasons: {
        safety_risk: 'Risk of roadway structural collapse and vehicle accidents',
        population_impact: 'Major arterial bridge junction serving North Madurai',
        urgency_spread: 'High loss of treated municipal potable water',
        sensitive_location: 'Bridge approach intersection',
      },
    },
    status: 'resolved',
    reportCount: 3,
    daysAgoCreated: 14,
    resolvedHoursAfterCreated: 38, // SLA 24h -> BREACH (38h > 24h)
    resolutionReason: 'TWAD engineering team isolated trunk valve, welded replacement steel sleeve, and backfilled asphalt sub-base.',
  },

  // P2 (High - 7 tickets)
  {
    category: 'pothole_damaged_road',
    subType: 'deep_crater',
    title: 'Deep crater in asphalt causing repeated two-wheeler skids',
    summary: 'Substantial pothole measuring 0.8m diameter and 15cm depth on temple ring road.',
    userText: 'Deep pothole on South Masi Street, multiple two-wheelers slipping and falling daily.',
    baseLat: LOCALITIES.meenakshi.lat,
    baseLng: LOCALITIES.meenakshi.lng,
    address: 'South Masi Street near South Tower, Madurai',
    factors: {
      safety_risk: 7,
      population_impact: 8,
      urgency_spread: 6,
      sensitive_location: 9,
      reasons: {
        safety_risk: 'High risk of bike crashes and loss of vehicle control',
        population_impact: 'Dense shopping and temple visitor corridor',
        urgency_spread: 'Asphalt crumbling further with bus traffic',
        sensitive_location: 'Meenakshi Amman heritage buffer zone',
      },
    },
    status: 'resolved',
    reportCount: 6,
    daysAgoCreated: 18,
    resolvedHoursAfterCreated: 48, // SLA 72h -> MET
    resolutionReason: 'Hot-mix asphalt filling and mechanical compaction completed by Corporation Roads Division.',
  },
  {
    category: 'sewage_overflow',
    subType: 'blocked_main',
    title: 'Underground drainage blockage overflowing on commercial shop fronts',
    summary: 'Blackwater sewage backing up from commercial inspection chamber onto pedestrian walkway.',
    userText: 'Drainage overflowing in front of market fruit shops with foul smell and contamination.',
    baseLat: LOCALITIES.simmakkal.lat,
    baseLng: LOCALITIES.simmakkal.lng,
    address: 'Simmakkal Main Road near Daily Market, Madurai',
    factors: {
      safety_risk: 7,
      population_impact: 7,
      urgency_spread: 8,
      sensitive_location: 7,
      reasons: {
        safety_risk: 'Waterborne pathogen transmission and severe biohazard',
        population_impact: 'Food vendors and pedestrian market shoppers',
        urgency_spread: 'Continuous sewage discharge into gutter',
        sensitive_location: 'Public fruit and vegetable market area',
      },
    },
    status: 'in_progress',
    reportCount: 2,
    daysAgoCreated: 2,
  },
  {
    category: 'garbage_dumping',
    subType: 'illegal_dump',
    title: 'Heavy uncollected waste accumulation blocking stormwater culvert',
    summary: 'Overflowing commercial and domestic solid waste obstructing roadside drainage channel.',
    userText: 'Large heap of garbage dumped near river bridge, culvert completely clogged with plastic.',
    baseLat: LOCALITIES.arapalayam.lat,
    baseLng: LOCALITIES.arapalayam.lng,
    address: 'Arapalayam Cross Road near Vaigai riverbank, Madurai',
    factors: {
      safety_risk: 6,
      population_impact: 7,
      urgency_spread: 7,
      sensitive_location: 7,
      reasons: {
        safety_risk: 'Vector-borne disease breeding and toxic runoff',
        population_impact: 'Residential perimeter and river walkway',
        urgency_spread: 'Plastic debris washing into Vaigai riverbed',
        sensitive_location: 'Riverbank drainage confluence',
      },
    },
    status: 'routed',
    reportCount: 3,
    daysAgoCreated: 1.5,
  },
  {
    category: 'water_pollution',
    subType: 'effluent_discharge',
    title: 'Chemical dye residue discharge into agricultural feeder canal',
    summary: 'Dark chemical effluent entering municipal canal with pungent odor and foam buildup.',
    userText: 'Chemical water coming from small workshop into canal, water is deep blue and smells bad.',
    baseLat: LOCALITIES.kknagar.lat,
    baseLng: LOCALITIES.kknagar.lng,
    address: 'East 4th Cross Street, K. K. Nagar, Madurai',
    factors: {
      safety_risk: 7,
      population_impact: 6,
      urgency_spread: 7,
      sensitive_location: 6,
      reasons: {
        safety_risk: 'Chemical toxicity affecting downstream soil and ground water',
        population_impact: 'Surrounding residential and farming plots',
        urgency_spread: 'Direct continuous discharge during night hours',
        sensitive_location: 'Feeder channel to local irrigation tank',
      },
    },
    status: 'resolved',
    reportCount: 1,
    daysAgoCreated: 22,
    resolvedHoursAfterCreated: 98, // SLA 72h -> BREACH (98h > 72h)
    resolutionReason: 'TNPCB pollution inspector sealed unpermitted discharge pipe and penalized workshop.',
    humanOverride: true,
  },
  {
    category: 'air_pollution',
    subType: 'open_burning',
    title: 'Open burning of commercial plastic waste creating toxic smoke plume',
    summary: 'Smoldering heap of synthetic packaging and rubber tyres producing heavy black particulate smoke.',
    userText: 'Someone set fire to huge pile of plastic scrap near railway line, thick smoke choking neighborhood.',
    baseLat: LOCALITIES.thirunagar.lat,
    baseLng: LOCALITIES.thirunagar.lng,
    address: 'Behind Thirunagar 3rd Stop, Railway Border Road, Madurai',
    factors: {
      safety_risk: 7,
      population_impact: 6,
      urgency_spread: 7,
      sensitive_location: 6,
      reasons: {
        safety_risk: 'Respiratory hazard from dioxins and particulate matter PM2.5',
        population_impact: 'Downwind residential colony and senior citizen home',
        urgency_spread: 'Uncontrolled fire spreading towards dry brush',
        sensitive_location: 'Adjacent to railway buffer easement',
      },
    },
    status: 'resolved',
    reportCount: 1,
    daysAgoCreated: 12,
    resolvedHoursAfterCreated: 36, // SLA 72h -> MET
    resolutionReason: 'Fire service doused blaze; Corporation sanitation staff cleared charred residue and posted no-burn signage.',
  },
  {
    category: 'other',
    subType: 'retaining_wall',
    title: 'Canal embankment retaining wall cracked and tilting toward road',
    summary: 'Concrete retaining wall displaying vertical shear cracks and tilting 15 degrees over roadway.',
    userText: 'Retaining wall alongside drainage canal cracked heavily, may collapse on traffic if rain comes.',
    baseLat: LOCALITIES.simmakkal.lat,
    baseLng: LOCALITIES.simmakkal.lng,
    address: 'North Veli Street, Simmakkal, Madurai',
    factors: {
      safety_risk: 7,
      population_impact: 7,
      urgency_spread: 6,
      sensitive_location: 7,
      reasons: {
        safety_risk: 'Structural collapse risk onto passing vehicular traffic',
        population_impact: 'Busiest commercial perimeter road in Old City',
        urgency_spread: 'Soil erosion accelerating wall displacement',
        sensitive_location: 'Historic city moat alignment',
      },
    },
    status: 'in_progress',
    reportCount: 1,
    daysAgoCreated: 3,
  },
  {
    category: 'open_manhole_drain',
    subType: 'broken_slab',
    title: 'Broken concrete slab over storm gutter on busy bus route',
    summary: 'Fractured RCC slab with exposed rebar over roadside stormwater gutter.',
    userText: 'Concrete cover on road drain broke under wheel of truck, tire trap right near signal.',
    baseLat: LOCALITIES.goripalayam.lat,
    baseLng: LOCALITIES.goripalayam.lng,
    address: 'Alagarkoil Road near Goripalayam Mosque, Madurai',
    factors: {
      safety_risk: 8,
      population_impact: 7,
      urgency_spread: 6,
      sensitive_location: 7,
      reasons: {
        safety_risk: 'Tire blowout risk and pedestrian trip hazard with jagged rebar',
        population_impact: 'Major north-bound bus and auto-rickshaw route',
        urgency_spread: 'Heavy vehicles worsening concrete crumble',
        sensitive_location: 'High-density religious and transit corridor',
      },
    },
    status: 'routed',
    reportCount: 2,
    daysAgoCreated: 2,
  },

  // P3 (Medium - 11 tickets)
  {
    category: 'pothole_damaged_road',
    subType: 'surface_wear',
    title: 'Multiple surface potholes along West Tower Street',
    summary: 'Cluster of asphalt pits along the left carriageway slowing pilgrim cart traffic.',
    userText: 'Several small but annoying potholes along West Tower Street.',
    baseLat: LOCALITIES.meenakshi.lat,
    baseLng: LOCALITIES.meenakshi.lng,
    address: 'West Tower Street near Chithirai Street, Madurai',
    factors: { safety_risk: 5, population_impact: 6, urgency_spread: 4, sensitive_location: 8 },
    status: 'resolved',
    reportCount: 1,
    daysAgoCreated: 16,
    resolvedHoursAfterCreated: 88, // SLA 168h -> MET
    resolutionReason: 'Cold mix patching applied and levelled across entire street section.',
  },
  {
    category: 'pothole_damaged_road',
    subType: 'depot_pothole',
    title: 'Asphalt erosion near Arapalayam bus depot entrance',
    summary: 'Depressed asphalt patch collecting stagnant wash water at bus entrance gate.',
    userText: 'Entrance to bus depot has eroded bitumen, buses shaking heavily.',
    baseLat: LOCALITIES.arapalayam.lat,
    baseLng: LOCALITIES.arapalayam.lng,
    address: 'Arapalayam Bus Depot Entry Gate, Madurai',
    factors: { safety_risk: 5, population_impact: 6, urgency_spread: 4, sensitive_location: 5 },
    status: 'in_progress',
    reportCount: 1,
    daysAgoCreated: 4,
  },
  {
    category: 'water_leak',
    subType: 'seepage',
    title: 'Continuous clean water seepage from distribution line valve',
    summary: 'Sub-surface distribution valve bubbling clear water onto curbside gutter.',
    userText: 'Drinking water pipe has small leak near corner shop, clean water being wasted.',
    baseLat: LOCALITIES.annanagar.lat,
    baseLng: LOCALITIES.annanagar.lng,
    address: '12th Cross Street, Anna Nagar, Madurai',
    factors: { safety_risk: 4, population_impact: 5, urgency_spread: 6, sensitive_location: 5 },
    status: 'resolved',
    reportCount: 1,
    daysAgoCreated: 8,
    resolvedHoursAfterCreated: 62, // SLA 168h -> MET
    resolutionReason: 'Valve gasket tightened and rubber gland packing replaced.',
  },
  {
    category: 'water_leak',
    subType: 'residential_leak',
    title: 'Subsurface drinking water leak saturating road sub-base',
    summary: 'Underground service connection leak causing soft mud heave under paver blocks.',
    userText: 'Water coming up from underground paver blocks, ground has become soft.',
    baseLat: LOCALITIES.kknagar.lat,
    baseLng: LOCALITIES.kknagar.lng,
    address: 'Sadasiva Nagar Main Road, K. K. Nagar, Madurai',
    factors: { safety_risk: 4, population_impact: 5, urgency_spread: 5, sensitive_location: 5 },
    status: 'routed',
    reportCount: 1,
    daysAgoCreated: 3,
  },
  {
    category: 'sewage_overflow',
    subType: 'rim_seepage',
    title: 'Manhole rim seepage during peak morning water supply hours',
    summary: 'Intermittent sewer surcharging around cast-iron frame during high discharge periods.',
    userText: 'Sewage seeping out around manhole cover every morning between 7 and 9 AM.',
    baseLat: LOCALITIES.thirunagar.lat,
    baseLng: LOCALITIES.thirunagar.lng,
    address: 'Kamarajar Salai, Thirunagar, Madurai',
    factors: { safety_risk: 5, population_impact: 5, urgency_spread: 5, sensitive_location: 5 },
    status: 'routed',
    reportCount: 1,
    daysAgoCreated: 2,
  },
  {
    category: 'garbage_dumping',
    subType: 'overflowing_bin',
    title: 'Overflowing roadside community dustbin on West Veli Street',
    summary: 'Municipal roll-off container filled beyond capacity with waste spilling onto roadway.',
    userText: 'Large dumper bin overflowing for 4 days, cows and dogs spreading garbage across road.',
    baseLat: LOCALITIES.periyar.lat,
    baseLng: LOCALITIES.periyar.lng,
    address: 'West Veli Street near Railway Station, Madurai',
    factors: { safety_risk: 4, population_impact: 6, urgency_spread: 5, sensitive_location: 6 },
    status: 'resolved',
    reportCount: 1,
    daysAgoCreated: 25,
    resolvedHoursAfterCreated: 215, // SLA 168h -> BREACH (215h > 168h)
    resolutionReason: 'Hydraulic compactor truck deployed for deep clearance, bin sanitized and replaced.',
  },
  {
    category: 'garbage_dumping',
    subType: 'market_waste',
    title: 'Uncleared market vegetable waste pile attracting stray animals',
    summary: 'Rotting biological vegetable residue accumulated behind produce stalls.',
    userText: 'Vegetable peels and rotten tomatoes dumped behind wholesale stalls, bad smell.',
    baseLat: LOCALITIES.simmakkal.lat,
    baseLng: LOCALITIES.simmakkal.lng,
    address: 'Wholesale Veg Market Lane, Simmakkal, Madurai',
    factors: { safety_risk: 4, population_impact: 6, urgency_spread: 5, sensitive_location: 5 },
    status: 'resolved',
    reportCount: 1,
    daysAgoCreated: 7,
    resolvedHoursAfterCreated: 70, // SLA 168h -> MET
    resolutionReason: 'Sanitation sweep crew cleared rotting organics and applied bleaching powder disinfectant.',
  },
  {
    category: 'streetlight_electrical',
    subType: 'failed_luminaire',
    title: 'Series of 4 sodium vapor streetlights not operational',
    summary: 'Dark stretch of approximately 150 meters due to unlit street poles.',
    userText: 'Streetlights not burning on 6th Main Road for the past three days, total darkness.',
    baseLat: LOCALITIES.kknagar.lat,
    baseLng: LOCALITIES.kknagar.lng,
    address: '6th Main Road, K. K. Nagar, Madurai',
    factors: { safety_risk: 5, population_impact: 4, urgency_spread: 3, sensitive_location: 5 },
    status: 'in_progress',
    reportCount: 1,
    daysAgoCreated: 4,
  },
  {
    category: 'streetlight_electrical',
    subType: 'damaged_box',
    title: 'Flickering mast luminaire with damaged junction box door',
    summary: 'Pole base control box hanging open with visible circuit wiring exposed to rain.',
    userText: 'Base door on light post is broken open and wires are visible, light keeps flickering.',
    baseLat: LOCALITIES.annanagar.lat,
    baseLng: LOCALITIES.annanagar.lng,
    address: 'Kuruvikaran Salai, Anna Nagar, Madurai',
    factors: { safety_risk: 5, population_impact: 5, urgency_spread: 4, sensitive_location: 4 },
    status: 'routed',
    reportCount: 1,
    daysAgoCreated: 1,
  },
  {
    category: 'noise_pollution',
    subType: 'generator_noise',
    title: 'Unregulated high-decibel generator operating in residential zone',
    summary: 'Commercial diesel generator without acoustic canopy operating continuously past 10 PM.',
    userText: 'Heavy diesel generator noise rattling windows of houses all night without silencer.',
    baseLat: LOCALITIES.goripalayam.lat,
    baseLng: LOCALITIES.goripalayam.lng,
    address: 'Munichalai Cross Lane near Goripalayam, Madurai',
    factors: { safety_risk: 4, population_impact: 5, urgency_spread: 4, sensitive_location: 5 },
    status: 'routed',
    reportCount: 1,
    daysAgoCreated: 2,
  },
  {
    category: 'water_pollution',
    subType: 'algae_blooms',
    title: 'Stagnant plastic waste and algae mats in Teppakulam temple tank edge',
    summary: 'Floating plastic bottles and thick eutrophic green algae accumulating at tank ghats.',
    userText: 'Plastic bottles and green sludge floating at Mariamman Teppakulam stepped ghats.',
    baseLat: LOCALITIES.meenakshi.lat,
    baseLng: LOCALITIES.meenakshi.lng,
    address: 'Vandiyur Mariamman Teppakulam Ghat, Madurai',
    factors: { safety_risk: 4, population_impact: 6, urgency_spread: 5, sensitive_location: 7 },
    status: 'resolved',
    reportCount: 1,
    daysAgoCreated: 15,
    resolvedHoursAfterCreated: 110, // SLA 168h -> MET
    resolutionReason: 'Floating debris net skimmers removed plastic waste; temple administration flushed inflow filter.',
  },

  // P4 (Low - 7 tickets)
  {
    category: 'pothole_damaged_road',
    subType: 'minor_wear',
    title: 'Small asphalt wear patch on residential colony cross street',
    summary: 'Minor aggregate loss and slight depression on cul-de-sac residential pavement.',
    userText: 'Slightly rough road patch in front of house number 45, not dangerous but bumpy.',
    baseLat: LOCALITIES.thirunagar.lat,
    baseLng: LOCALITIES.thirunagar.lng,
    address: '4th Cross, Thirunagar Extn, Madurai',
    factors: { safety_risk: 2, population_impact: 2, urgency_spread: 2, sensitive_location: 2 },
    status: 'submitted',
    reportCount: 1,
    daysAgoCreated: 1,
  },
  {
    category: 'sewage_overflow',
    subType: 'minor_odor',
    title: 'Faint foul odor from roadside stormwater catch basin',
    summary: 'Minor dry-weather odor from trapped organic leaves in stormwater basin.',
    userText: 'Occasional bad smell coming from corner drain inlet during hot afternoon.',
    baseLat: LOCALITIES.kknagar.lat,
    baseLng: LOCALITIES.kknagar.lng,
    address: 'Opposite Park, Sector 2, K. K. Nagar, Madurai',
    factors: { safety_risk: 2, population_impact: 3, urgency_spread: 2, sensitive_location: 2 },
    status: 'submitted',
    reportCount: 1,
    daysAgoCreated: 2,
  },
  {
    category: 'open_manhole_drain',
    subType: 'grate_rattle',
    title: 'Slightly misaligned drainage grates creating minor rattle',
    summary: 'Steel storm drain grating sits unevenly in concrete frame, producing noise when cars drive over.',
    userText: 'Iron grate on drain rattles loudly when cars pass by.',
    baseLat: LOCALITIES.annanagar.lat,
    baseLng: LOCALITIES.annanagar.lng,
    address: 'Near Corporation Bank, Anna Nagar, Madurai',
    factors: { safety_risk: 3, population_impact: 3, urgency_spread: 2, sensitive_location: 3 },
    status: 'submitted',
    reportCount: 1,
    daysAgoCreated: 3,
  },
  {
    category: 'garbage_dumping',
    subType: 'leaf_litter',
    title: 'Dry leaf litter and cardboard boxes piled on median curb',
    summary: 'Accumulation of swept garden trimmings and cardboard carton packaging.',
    userText: 'Dry tree branches and cardboard boxes placed on center median curb.',
    baseLat: LOCALITIES.goripalayam.lat,
    baseLng: LOCALITIES.goripalayam.lng,
    address: 'Panagal Road, Goripalayam, Madurai',
    factors: { safety_risk: 2, population_impact: 3, urgency_spread: 2, sensitive_location: 2 },
    status: 'submitted',
    reportCount: 1,
    daysAgoCreated: 0.5,
  },
  {
    category: 'air_pollution',
    subType: 'chimney_exhaust',
    title: 'Mild kitchen chimney exhaust blowing low across lane',
    summary: 'Small commercial tea stall chimney vent oriented towards pedestrian alley.',
    userText: 'Tea shop wood fire smoke coming across lane during morning tea hours.',
    baseLat: LOCALITIES.simmakkal.lat,
    baseLng: LOCALITIES.simmakkal.lng,
    address: 'Vakkil New Street, Simmakkal, Madurai',
    factors: { safety_risk: 2, population_impact: 3, urgency_spread: 2, sensitive_location: 2 },
    status: 'routed',
    reportCount: 1,
    daysAgoCreated: 2,
  },
  {
    category: 'noise_pollution',
    subType: 'shop_speaker',
    title: 'Commercial shop outdoor promotional loudspeaker during day',
    summary: 'Retail textile shop playing promotional announcements over external small horn.',
    userText: 'Cloth shop speaker announcing discount sales all morning.',
    baseLat: LOCALITIES.arapalayam.lat,
    baseLng: LOCALITIES.arapalayam.lng,
    address: 'Bus Stand Approach Road, Arapalayam, Madurai',
    factors: { safety_risk: 2, population_impact: 3, urgency_spread: 3, sensitive_location: 2 },
    status: 'in_progress',
    reportCount: 1,
    daysAgoCreated: 5,
  },
  {
    category: 'other',
    subType: 'loose_curb',
    title: 'Loose curbstone displaced on outer ring road pedestrian path',
    summary: 'Single concrete curbstone dislodged and resting tilted against footpath edge.',
    userText: 'One curb stone loose on walkway, needs to be cemented back in place.',
    baseLat: LOCALITIES.periyar.lat,
    baseLng: LOCALITIES.periyar.lng,
    address: 'Near Madurai Junction Railway Footover Bridge, Madurai',
    factors: { safety_risk: 2, population_impact: 2, urgency_spread: 1, sensitive_location: 2 },
    status: 'routed',
    reportCount: 1,
    daysAgoCreated: 3,
  },
];

async function seed() {
  console.log('--- Starting CivicLens Seed Script ---');
  console.log(`Target Supabase: ${supabaseUrl}`);

  // 1. Fetch departments
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id, slug, name, categories, email');

  if (deptError || !departments || departments.length === 0) {
    throw new Error(`Failed to load departments from database: ${deptError?.message}`);
  }
  console.log(`Loaded ${departments.length} departments from database.`);

  // 2. Idempotent cleanup: delete existing seed reports (cascades to media, status, resolutions, dispatches)
  console.log('Cleaning up existing seed records (where is_seed = true)...');
  const { error: deleteError } = await supabase
    .from('reports')
    .delete()
    .eq('is_seed', true);

  if (deleteError) {
    throw new Error(`Failed to delete old seed records: ${deleteError.message}`);
  }
  console.log('Old seed records deleted successfully.');

  const now = new Date();
  let insertedCount = 0;
  let p1Count = 0;
  let p2Count = 0;
  let p3Count = 0;
  let p4Count = 0;
  let breachCount = 0;

  for (let i = 0; i < SEED_REPORTS.length; i++) {
    const def = SEED_REPORTS[i];

    // Jitter coordinates by +/- 0.0015 degrees (approx 150m, well inside Madurai city)
    const jitterLat = (Math.sin(i * 3.7 + 1.2) * 0.0015);
    const jitterLng = (Math.cos(i * 2.3 + 0.8) * 0.0015);
    const lat = Math.round((def.baseLat + jitterLat) * 100000) / 100000;
    const lng = Math.round((def.baseLng + jitterLng) * 100000) / 100000;

    // Creation timestamp spread over the last 30 days
    const createdAt = new Date(now.getTime() - def.daysAgoCreated * 24 * 60 * 60 * 1000);

    // Compute severity & priority using the canonical formula
    const severityRes = calculateSeverity({
      factors: def.factors,
      reportCount: def.reportCount,
      createdAt,
      now,
    });

    const priority: Priority = severityRes.priority;
    if (priority === 'P1') p1Count++;
    if (priority === 'P2') p2Count++;
    if (priority === 'P3') p3Count++;
    if (priority === 'P4') p4Count++;

    const slaDueAt = calculateSlaDueAt(createdAt, priority);

    // Resolution timestamp (if resolved)
    let resolvedAt: Date | null = null;
    if (def.status === 'resolved' && def.resolvedHoursAfterCreated !== undefined) {
      resolvedAt = new Date(createdAt.getTime() + def.resolvedHoursAfterCreated * 60 * 60 * 1000);
      if (resolvedAt.getTime() > slaDueAt.getTime()) {
        breachCount++;
      }
    }

    // Resolve Department
    const dept = resolveDepartmentForCategory(departments as Department[], def.category);
    const deptId = dept ? dept.id : null;

    const ticketId = generateTicketId();
    const mediaPath = `/seed/${def.category}_before.svg`;

    // 3. Insert Report
    const { data: report, error: reportErr } = await supabase
      .from('reports')
      .insert({
        ticket_id: ticketId,
        category: def.category,
        sub_type: def.subType || null,
        title: def.title,
        summary: def.summary,
        user_text: def.userText,
        lat,
        lng,
        address: def.address,
        media_path: mediaPath,
        media_type: 'image',
        factor_scores: def.factors,
        ai_used: true,
        ai_confidence: 0.94,
        needs_human_review: false,
        status: def.status,
        department_id: deptId,
        report_count: def.reportCount,
        is_seed: true,
        created_at: createdAt.toISOString(),
        sla_due_at: slaDueAt.toISOString(),
        resolved_at: resolvedAt ? resolvedAt.toISOString() : null,
      })
      .select('id')
      .single();

    if (reportErr || !report) {
      throw new Error(`Failed to insert report [${ticketId}]: ${reportErr?.message}`);
    }

    const reportId = report.id;

    // 4. Insert Primary Media row
    await supabase.from('report_media').insert({
      report_id: reportId,
      path: mediaPath,
      media_type: 'image',
      is_primary: true,
      created_at: createdAt.toISOString(),
    });

    // 5. Insert Status Events
    // Event 1: Submitted
    await supabase.from('status_events').insert({
      report_id: reportId,
      status: 'submitted',
      actor: 'citizen',
      note: 'Civic grievance submitted by citizen reporter with geo-tagged photographic evidence.',
      created_at: createdAt.toISOString(),
    });

    // Event 2: Routed (if routed, in_progress, or resolved)
    if (def.status !== 'submitted') {
      const routedTime = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5 min after submission
      await supabase.from('status_events').insert({
        report_id: reportId,
        status: 'routed',
        actor: 'system',
        note: `Multimodal AI scored severity (${severityRes.score}/100, ${priority}) and routed ticket to ${dept?.name || 'General Grievance Cell'}.`,
        created_at: routedTime.toISOString(),
      });

      // Insert Simulated Dispatch Row
      await supabase.from('dispatches').insert({
        report_id: reportId,
        department_id: deptId,
        to_email: dept?.email || 'general@civiclens.invalid',
        subject: `[${ticketId}] Civic Grievance Triage Notice - ${def.title}`,
        body: `Automated dispatch notification from CivicLens system to ${dept?.name}. Priority: ${priority}. SLA Due: ${slaDueAt.toISOString()}.`,
        simulated: true,
        provider_message_id: `seed_sim_${ticketId}_${Date.now()}`,
        created_at: routedTime.toISOString(),
      });
    }

    // Event 3: In Progress (if in_progress or resolved)
    if (def.status === 'in_progress' || def.status === 'resolved') {
      const inProgressTime = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours after
      await supabase.from('status_events').insert({
        report_id: reportId,
        status: 'in_progress',
        actor: 'authority',
        note: 'Municipal engineering field team deployed to site with repair equipment.',
        created_at: inProgressTime.toISOString(),
      });
    }

    // Event 4: Resolved (if resolved)
    if (def.status === 'resolved' && resolvedAt) {
      await supabase.from('status_events').insert({
        report_id: reportId,
        status: 'resolved',
        actor: 'authority',
        note: def.resolutionReason || 'Repair work completed. Site inspected and confirmed restored.',
        created_at: resolvedAt.toISOString(),
      });

      // Insert Resolution Row
      const afterPath = `/seed/${def.category}_after.svg`;
      await supabase.from('resolutions').insert({
        report_id: reportId,
        after_path: afterPath,
        same_location: true,
        issue_resolved: true,
        confidence: 0.92,
        reason: def.resolutionReason || 'Visual inspection confirms defect resolved at same coordinates.',
        ai_verdict: 'resolved',
        human_override: def.humanOverride || false,
        note: 'Work verified by Madurai Corporation field supervisor.',
        created_at: resolvedAt.toISOString(),
      });
    }

    insertedCount++;
  }

  console.log(`\nSuccessfully seeded ${insertedCount} realistic Madurai reports!`);
  console.log(`Priority Distribution: P1=${p1Count}, P2=${p2Count}, P3=${p3Count}, P4=${p4Count}`);
  console.log(`Resolved with SLA Breaches: ${breachCount} of 10 resolved`);
  console.log('--- Seed Completed Successfully ---');
}

seed().catch((err) => {
  console.error('Fatal error during seed execution:', err);
  process.exit(1);
});
