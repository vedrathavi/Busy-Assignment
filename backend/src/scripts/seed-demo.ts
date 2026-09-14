import { PrismaClient, UserRole, DealStage, HistoryType, TaskPriority, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================================
// Core Baseline Constants (Read-Only References)
// ============================================================================
const ORG_ID = '00000000-0000-4000-8000-000000000001';
const TEAM_ID = '00000000-0000-4000-8000-000000000002';

const BASELINE_USERS = {
  manager: '10000000-0000-4000-8000-000000000001', // Sarah Jenkins
  rep1:    '10000000-0000-4000-8000-000000000002', // Alex Rivera
  rep2:    '10000000-0000-4000-8000-000000000003', // Priya Sharma
  rep3:    '10000000-0000-4000-8000-000000000004', // Marcus Chen
};

// ============================================================================
// Deterministic Demo UUID Namespaces
// ============================================================================

export const DEMO_USERS = {
  rep4_rohan: '50000000-0000-4000-8000-000000000001', // Rohan Mehta
  rep5_elena: '50000000-0000-4000-8000-000000000002', // Elena Rostova
  rep6_david: '50000000-0000-4000-8000-000000000003', // David Kim
};

export const DEMO_COMPANIES = {
  novabio:     '60000000-0000-4000-8000-000000000001',
  aetheris:    '60000000-0000-4000-8000-000000000002',
  crestview:   '60000000-0000-4000-8000-000000000003',
  omnistack:   '60000000-0000-4000-8000-000000000004',
  bluewave:    '60000000-0000-4000-8000-000000000005',
  veritas:     '60000000-0000-4000-8000-000000000006',
  strataform:  '60000000-0000-4000-8000-000000000007',
  solaris:     '60000000-0000-4000-8000-000000000008',
  kestrel:     '60000000-0000-4000-8000-000000000009',
  quantix:     '60000000-0000-4000-8000-000000000010',
};

export async function seedDemoDataset() {
  console.log('🚀 Starting Demo Dataset Seed for BUSY Sales CRM...');
  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // --------------------------------------------------------------------------
  // 1. Demo Sales Representatives (3 realistic B2B reps)
  // --------------------------------------------------------------------------
  console.log('👤 Seeding Demo Sales Representatives...');
  const demoUsersData = [
    {
      id: DEMO_USERS.rep4_rohan,
      name: 'Rohan Mehta',
      email: 'rohan@busy.com',
      role: UserRole.SALES_REP,
      organizationId: ORG_ID,
      teamId: TEAM_ID,
      passwordHash,
    },
    {
      id: DEMO_USERS.rep5_elena,
      name: 'Elena Rostova',
      email: 'elena@busy.com',
      role: UserRole.SALES_REP,
      organizationId: ORG_ID,
      teamId: TEAM_ID,
      passwordHash,
    },
    {
      id: DEMO_USERS.rep6_david,
      name: 'David Kim',
      email: 'david@busy.com',
      role: UserRole.SALES_REP,
      organizationId: ORG_ID,
      teamId: TEAM_ID,
      passwordHash,
    },
  ];

  for (const user of demoUsersData) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  // --------------------------------------------------------------------------
  // 2. Demo Companies (10 diverse B2B companies across multiple verticals)
  // --------------------------------------------------------------------------
  console.log('🏢 Seeding Demo Companies...');
  const demoCompaniesData = [
    {
      id: DEMO_COMPANIES.novabio,
      teamId: TEAM_ID,
      ownerId: DEMO_USERS.rep4_rohan,
      name: 'NovaBio Therapeutics',
      industry: 'Healthcare & Biotech',
      website: 'https://novabio.example.com',
      isArchived: false,
    },
    {
      id: DEMO_COMPANIES.aetheris,
      teamId: TEAM_ID,
      ownerId: DEMO_USERS.rep5_elena,
      name: 'Aetheris Telemetry Solutions',
      industry: 'Industrial IoT & Sensors',
      website: 'https://aetheristelemetry.example.com',
      isArchived: false,
    },
    {
      id: DEMO_COMPANIES.crestview,
      teamId: TEAM_ID,
      ownerId: DEMO_USERS.rep6_david,
      name: 'Crestview Financial Partners',
      industry: 'Asset Management & Fintech',
      website: 'https://crestviewfinancial.example.com',
      isArchived: false,
    },
    {
      id: DEMO_COMPANIES.omnistack,
      teamId: TEAM_ID,
      ownerId: BASELINE_USERS.rep1,
      name: 'OmniStack Infrastructure',
      industry: 'Cloud Platform & DevOps',
      website: 'https://omnistack.example.com',
      isArchived: false,
    },
    {
      id: DEMO_COMPANIES.bluewave,
      teamId: TEAM_ID,
      ownerId: BASELINE_USERS.rep2,
      name: 'BlueWave Maritime Logistics',
      industry: 'Maritime & Global Freight',
      website: 'https://bluewavelogistics.example.com',
      isArchived: false,
    },
    {
      id: DEMO_COMPANIES.veritas,
      teamId: TEAM_ID,
      ownerId: BASELINE_USERS.rep3,
      name: 'Veritas Cyber Defense',
      industry: 'Cybersecurity & Zero Trust',
      website: 'https://veritascyber.example.com',
      isArchived: false,
    },
    {
      id: DEMO_COMPANIES.strataform,
      teamId: TEAM_ID,
      ownerId: DEMO_USERS.rep4_rohan,
      name: 'Strataform Robotics',
      industry: 'Advanced Robotics & Automation',
      website: 'https://strataformrobotics.example.com',
      isArchived: false,
    },
    {
      id: DEMO_COMPANIES.solaris,
      teamId: TEAM_ID,
      ownerId: DEMO_USERS.rep5_elena,
      name: 'Solaris Agritech Systems',
      industry: 'Agricultural Technology',
      website: 'https://solarisagritech.example.com',
      isArchived: false,
    },
    {
      id: DEMO_COMPANIES.kestrel,
      teamId: TEAM_ID,
      ownerId: DEMO_USERS.rep6_david,
      name: 'Kestrel Commercial Properties',
      industry: 'Commercial Real Estate & Proptech',
      website: 'https://kestrelproperties.example.com',
      isArchived: false,
    },
    {
      id: DEMO_COMPANIES.quantix,
      teamId: TEAM_ID,
      ownerId: BASELINE_USERS.rep2,
      name: 'Quantix Analytical Instruments',
      industry: 'Scientific & Laboratory Tech',
      website: 'https://quantixinstruments.example.com',
      isArchived: false,
    },
  ];

  for (const comp of demoCompaniesData) {
    await prisma.company.upsert({
      where: { id: comp.id },
      update: comp,
      create: comp,
    });
  }

  // --------------------------------------------------------------------------
  // 3. Demo Deals (34 realistic deals forming a healthy, believable sales funnel)
  // --------------------------------------------------------------------------
  console.log('💼 Seeding Demo Deals...');

  const demoDealsData = [
    // --- NEW STAGE (4 deals) ---
    {
      id: '70000000-0000-4000-8000-000000000001',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.novabio,
      ownerId: DEMO_USERS.rep4_rohan,
      title: 'Clinical Trial Management Platform',
      value: '145000.00',
      expectedCloseDate: new Date('2026-11-20'),
      stage: DealStage.NEW,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000002',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.crestview,
      ownerId: DEMO_USERS.rep6_david,
      title: 'Real-Time Portfolio Risk Engine',
      value: '220000.00',
      expectedCloseDate: new Date('2026-12-05'),
      stage: DealStage.NEW,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000003',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.strataform,
      ownerId: DEMO_USERS.rep4_rohan,
      title: 'Warehouse Palletizing Robot Cell',
      value: '310000.00',
      expectedCloseDate: new Date('2026-11-30'),
      stage: DealStage.NEW,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000004',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.solaris,
      ownerId: DEMO_USERS.rep5_elena,
      title: 'Precision Irrigation Sensor Pilot',
      value: '78000.00',
      expectedCloseDate: new Date('2026-12-15'),
      stage: DealStage.NEW,
      closedAt: null,
      previousStage: null,
    },

    // --- QUALIFIED STAGE (6 deals) ---
    {
      id: '70000000-0000-4000-8000-000000000005',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.aetheris,
      ownerId: DEMO_USERS.rep5_elena,
      title: 'Refinery Vibration Telemetry Grid',
      value: '185000.00',
      expectedCloseDate: new Date('2026-10-25'),
      stage: DealStage.QUALIFIED,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000006',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.omnistack,
      ownerId: BASELINE_USERS.rep1,
      title: 'Kubernetes Multi-Region Mesh',
      value: '160000.00',
      expectedCloseDate: new Date('2026-11-10'),
      stage: DealStage.QUALIFIED,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000007',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.bluewave,
      ownerId: BASELINE_USERS.rep2,
      title: 'Vessel Route Optimization Suite',
      value: '195000.00',
      expectedCloseDate: new Date('2026-10-30'),
      stage: DealStage.QUALIFIED,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000008',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.veritas,
      ownerId: BASELINE_USERS.rep3,
      title: 'Identity Governance Automation',
      value: '135000.00',
      expectedCloseDate: new Date('2026-11-05'),
      stage: DealStage.QUALIFIED,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000009',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.kestrel,
      ownerId: DEMO_USERS.rep6_david,
      title: 'Tenant Experience Mobile App',
      value: '92000.00',
      expectedCloseDate: new Date('2026-10-18'),
      stage: DealStage.QUALIFIED,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000010',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.quantix,
      ownerId: BASELINE_USERS.rep2,
      title: 'Spectrometer Data Sync Interface',
      value: '115000.00',
      expectedCloseDate: new Date('2026-10-22'),
      stage: DealStage.QUALIFIED,
      closedAt: null,
      previousStage: null,
    },

    // --- PROPOSAL STAGE (8 deals) ---
    {
      id: '70000000-0000-4000-8000-000000000011',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.novabio,
      ownerId: DEMO_USERS.rep4_rohan,
      title: 'Bio-Repository Sample Tracking',
      value: '275000.00',
      expectedCloseDate: new Date('2026-10-10'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000012',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.aetheris,
      ownerId: DEMO_USERS.rep5_elena,
      title: 'Predictive Maintenance Analytics',
      value: '240000.00',
      expectedCloseDate: new Date('2026-09-28'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000013',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.crestview,
      ownerId: DEMO_USERS.rep6_david,
      title: 'Algorithmic Trade Reconciliation',
      value: '380000.00',
      expectedCloseDate: new Date('2026-10-05'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000014',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.omnistack,
      ownerId: BASELINE_USERS.rep1,
      title: 'Zero-Downtime Database Migration',
      value: '190000.00',
      expectedCloseDate: new Date('2026-09-24'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000015',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.bluewave,
      ownerId: BASELINE_USERS.rep2,
      title: 'Container Manifest EDI Gateway',
      value: '170000.00',
      expectedCloseDate: new Date('2026-09-18'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000016',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.veritas,
      ownerId: BASELINE_USERS.rep3,
      title: 'SOC 2 Automated Compliance Portal',
      value: '150000.00',
      expectedCloseDate: new Date('2026-10-12'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000017',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.strataform,
      ownerId: DEMO_USERS.rep4_rohan,
      title: 'Vision-Guided Sorting System',
      value: '420000.00',
      expectedCloseDate: new Date('2026-10-20'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000018',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.solaris,
      ownerId: DEMO_USERS.rep5_elena,
      title: 'Soil Nutrient Telemetry Hub (Overdue Proposal)',
      value: '88000.00',
      expectedCloseDate: new Date('2026-09-02'), // Overdue open deal
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
    },

    // --- NEGOTIATION STAGE (7 deals) ---
    {
      id: '70000000-0000-4000-8000-000000000019',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.novabio,
      ownerId: DEMO_USERS.rep4_rohan,
      title: 'Enterprise LIMS Integration Contract',
      value: '520000.00',
      expectedCloseDate: new Date('2026-09-22'),
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000020',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.aetheris,
      ownerId: DEMO_USERS.rep5_elena,
      title: 'Turbine Edge Computing Licenses',
      value: '340000.00',
      expectedCloseDate: new Date('2026-09-19'),
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000021',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.crestview,
      ownerId: DEMO_USERS.rep6_david,
      title: 'Hedge Fund Order Execution Gateway',
      value: '680000.00',
      expectedCloseDate: new Date('2026-09-25'),
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000022',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.kestrel,
      ownerId: DEMO_USERS.rep6_david,
      title: 'Commercial Building Automation Master Agreement',
      value: '450000.00',
      expectedCloseDate: new Date('2026-09-29'),
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000023',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.quantix,
      ownerId: BASELINE_USERS.rep2,
      title: 'Global Lab Equipment Telemetry Contract',
      value: '290000.00',
      expectedCloseDate: new Date('2026-09-20'),
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000024',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.bluewave,
      ownerId: BASELINE_USERS.rep2,
      title: 'Fleet Port Terminal API Licensing (Overdue Negotiation)',
      value: '210000.00',
      expectedCloseDate: new Date('2026-09-08'), // Overdue open deal
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
    },
    {
      id: '70000000-0000-4000-8000-000000000025',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.strataform,
      ownerId: DEMO_USERS.rep4_rohan,
      title: 'Automated Conveyor Retrofit Contract (Overdue)',
      value: '190000.00',
      expectedCloseDate: new Date('2026-09-06'), // Overdue open deal
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
    },

    // --- WON STAGE (6 deals) ---
    {
      id: '70000000-0000-4000-8000-000000000026',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.novabio,
      ownerId: DEMO_USERS.rep4_rohan,
      title: 'Genomics Data Warehouse Expansion',
      value: '480000.00',
      expectedCloseDate: new Date('2026-09-01'),
      stage: DealStage.WON,
      closedAt: new Date('2026-09-01T14:30:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
    },
    {
      id: '70000000-0000-4000-8000-000000000027',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.aetheris,
      ownerId: DEMO_USERS.rep5_elena,
      title: 'Factory-Wide IoT Gateway Deployment',
      value: '390000.00',
      expectedCloseDate: new Date('2026-09-04'),
      stage: DealStage.WON,
      closedAt: new Date('2026-09-04T11:00:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
    },
    {
      id: '70000000-0000-4000-8000-000000000028',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.crestview,
      ownerId: DEMO_USERS.rep6_david,
      title: 'Wealth Management Client Portal',
      value: '320000.00',
      expectedCloseDate: new Date('2026-08-28'),
      stage: DealStage.WON,
      closedAt: new Date('2026-08-28T16:45:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
    },
    {
      id: '70000000-0000-4000-8000-000000000029',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.omnistack,
      ownerId: BASELINE_USERS.rep1,
      title: 'Enterprise Serverless Compute Plan',
      value: '260000.00',
      expectedCloseDate: new Date('2026-09-10'),
      stage: DealStage.WON,
      closedAt: new Date('2026-09-10T15:20:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
    },
    {
      id: '70000000-0000-4000-8000-000000000030',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.veritas,
      ownerId: BASELINE_USERS.rep3,
      title: 'Managed Threat Detection 3-Year Service',
      value: '410000.00',
      expectedCloseDate: new Date('2026-08-15'),
      stage: DealStage.WON,
      closedAt: new Date('2026-08-15T10:00:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
    },
    {
      id: '70000000-0000-4000-8000-000000000031',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.solaris,
      ownerId: DEMO_USERS.rep5_elena,
      title: 'Agri-Coop Drone Spraying Telemetry',
      value: '190000.00',
      expectedCloseDate: new Date('2026-09-07'),
      stage: DealStage.WON,
      closedAt: new Date('2026-09-07T17:00:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
    },

    // --- LOST STAGE (3 deals) ---
    {
      id: '70000000-0000-4000-8000-000000000032',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.kestrel,
      ownerId: DEMO_USERS.rep6_david,
      title: 'Smart Metering Power Grid Subsystem',
      value: '125000.00',
      expectedCloseDate: new Date('2026-08-10'),
      stage: DealStage.LOST,
      closedAt: new Date('2026-08-10T09:30:00.000Z'),
      previousStage: DealStage.PROPOSAL,
    },
    {
      id: '70000000-0000-4000-8000-000000000033',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.bluewave,
      ownerId: BASELINE_USERS.rep2,
      title: 'Drydock Scheduling SaaS Integration',
      value: '95000.00',
      expectedCloseDate: new Date('2026-08-25'),
      stage: DealStage.LOST,
      closedAt: new Date('2026-08-25T14:15:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
    },
    {
      id: '70000000-0000-4000-8000-000000000034',
      teamId: TEAM_ID,
      companyId: DEMO_COMPANIES.strataform,
      ownerId: DEMO_USERS.rep4_rohan,
      title: 'Autonomous Mobile Robot Fleet Pilot',
      value: '230000.00',
      expectedCloseDate: new Date('2026-09-03'),
      stage: DealStage.LOST,
      closedAt: new Date('2026-09-03T11:45:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
    },
  ];

  for (const deal of demoDealsData) {
    await prisma.deal.upsert({
      where: { id: deal.id },
      update: {
        teamId: deal.teamId,
        companyId: deal.companyId,
        ownerId: deal.ownerId,
        title: deal.title,
        value: deal.value,
        expectedCloseDate: deal.expectedCloseDate,
        stage: deal.stage,
        closedAt: deal.closedAt,
        previousStage: deal.previousStage,
        deletedAt: null,
        deletedById: null,
      },
      create: {
        id: deal.id,
        teamId: deal.teamId,
        companyId: deal.companyId,
        ownerId: deal.ownerId,
        title: deal.title,
        value: deal.value,
        expectedCloseDate: deal.expectedCloseDate,
        stage: deal.stage,
        closedAt: deal.closedAt,
        previousStage: deal.previousStage,
      },
    });
  }

  // --------------------------------------------------------------------------
  // 4. Demo Collaborators (Strategic cross-collaboration between reps)
  // --------------------------------------------------------------------------
  console.log('🤝 Seeding Demo Deal Collaborators...');
  const demoCollaboratorsData = [
    { dealId: '70000000-0000-4000-8000-000000000019', userId: DEMO_USERS.rep5_elena }, // Rohan + Elena on LIMS
    { dealId: '70000000-0000-4000-8000-000000000019', userId: BASELINE_USERS.rep1 },   // Rohan + Alex on LIMS
    { dealId: '70000000-0000-4000-8000-000000000021', userId: DEMO_USERS.rep4_rohan }, // David + Rohan on Hedge Fund
    { dealId: '70000000-0000-4000-8000-000000000013', userId: BASELINE_USERS.rep3 },   // David + Marcus on Algorithmic
    { dealId: '70000000-0000-4000-8000-000000000020', userId: DEMO_USERS.rep6_david }, // Elena + David on Turbine
    { dealId: '70000000-0000-4000-8000-000000000022', userId: BASELINE_USERS.rep2 },   // David + Priya on Building Automation
    { dealId: '70000000-0000-4000-8000-000000000017', userId: DEMO_USERS.rep5_elena }, // Rohan + Elena on Vision Sorting
  ];

  for (const collab of demoCollaboratorsData) {
    await prisma.dealCollaborator.upsert({
      where: { dealId_userId: { dealId: collab.dealId, userId: collab.userId } },
      update: {},
      create: collab,
    });
  }

  // --------------------------------------------------------------------------
  // 5. Demo Deal History (Believable chronological audit logs for Deal Detail)
  // --------------------------------------------------------------------------
  console.log('📜 Seeding Demo Deal History...');
  const demoHistoryData = [
    // History for Won Deal 26
    {
      id: '75000000-0000-4000-8000-000000000001',
      dealId: '70000000-0000-4000-8000-000000000026',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.CREATED,
      createdAt: new Date('2026-08-01T09:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000002',
      dealId: '70000000-0000-4000-8000-000000000026',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-08-10T11:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000003',
      dealId: '70000000-0000-4000-8000-000000000026',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.QUALIFIED,
      newStage: DealStage.PROPOSAL,
      createdAt: new Date('2026-08-18T14:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000004',
      dealId: '70000000-0000-4000-8000-000000000026',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.PROPOSAL,
      newStage: DealStage.NEGOTIATION,
      createdAt: new Date('2026-08-25T16:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000005',
      dealId: '70000000-0000-4000-8000-000000000026',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEGOTIATION,
      newStage: DealStage.WON,
      createdAt: new Date('2026-09-01T14:30:00.000Z'),
    },

    // History for Active Negotiation Deal 19
    {
      id: '75000000-0000-4000-8000-000000000006',
      dealId: '70000000-0000-4000-8000-000000000019',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.CREATED,
      createdAt: new Date('2026-08-12T10:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000007',
      dealId: '70000000-0000-4000-8000-000000000019',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-08-20T11:30:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000008',
      dealId: '70000000-0000-4000-8000-000000000019',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.COLLABORATOR_ADDED,
      collaboratorId: DEMO_USERS.rep5_elena,
      createdAt: new Date('2026-08-22T09:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000009',
      dealId: '70000000-0000-4000-8000-000000000019',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.QUALIFIED,
      newStage: DealStage.PROPOSAL,
      createdAt: new Date('2026-08-29T15:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000010',
      dealId: '70000000-0000-4000-8000-000000000019',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.NOTE_ADDED,
      note: 'Presented custom integration architecture to Chief Medical Officer. Pricing discounts requested for 3-year term.',
      createdAt: new Date('2026-09-05T13:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000011',
      dealId: '70000000-0000-4000-8000-000000000019',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.PROPOSAL,
      newStage: DealStage.NEGOTIATION,
      createdAt: new Date('2026-09-09T16:00:00.000Z'),
    },

    // History for Lost Deal 34 with backward reason
    {
      id: '75000000-0000-4000-8000-000000000012',
      dealId: '70000000-0000-4000-8000-000000000034',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.CREATED,
      createdAt: new Date('2026-08-05T10:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000013',
      dealId: '70000000-0000-4000-8000-000000000034',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-08-14T11:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000014',
      dealId: '70000000-0000-4000-8000-000000000034',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.QUALIFIED,
      newStage: DealStage.PROPOSAL,
      createdAt: new Date('2026-08-22T14:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000015',
      dealId: '70000000-0000-4000-8000-000000000034',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.PROPOSAL,
      newStage: DealStage.NEGOTIATION,
      createdAt: new Date('2026-08-28T16:00:00.000Z'),
    },
    {
      id: '75000000-0000-4000-8000-000000000016',
      dealId: '70000000-0000-4000-8000-000000000034',
      actorId: DEMO_USERS.rep4_rohan,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEGOTIATION,
      newStage: DealStage.LOST,
      reason: 'Competitor offered heavy hardware bundling subsidy. Retaining relationship for FY27 warehouse expansion.',
      createdAt: new Date('2026-09-03T11:45:00.000Z'),
    },
  ];

  for (const h of demoHistoryData) {
    await prisma.dealHistory.upsert({
      where: { id: h.id },
      update: h,
      create: h,
    });
  }

  // --------------------------------------------------------------------------
  // 6. Demo Tasks (44 realistic sales follow-up tasks with multi-assignee support)
  // --------------------------------------------------------------------------
  console.log('📋 Seeding Demo Tasks...');

  interface DemoTaskDef {
    id: string;
    dealId: string;
    title: string;
    description?: string;
    priority: TaskPriority;
    createdById: string;
    dueDate: Date;
    completedAt?: Date | null;
    assignees: {
      userId: string;
      completedAt?: Date | null;
      completionNote?: string | null;
    }[];
  }

  const demoTasksData: DemoTaskDef[] = [
    // --- COMPLETED TASKS (18 tasks) ---
    {
      id: '80000000-0000-4000-8000-000000000001',
      dealId: '70000000-0000-4000-8000-000000000026', // Won Deal 26
      title: 'Conduct initial discovery call with VP of Informatics',
      description: 'Review bioinformatics pipeline capacity and regulatory compliance boundaries.',
      priority: TaskPriority.HIGH,
      createdById: BASELINE_USERS.manager,
      dueDate: new Date('2026-08-08'),
      completedAt: new Date('2026-08-08T15:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep4_rohan,
          completedAt: new Date('2026-08-08T15:00:00.000Z'),
          completionNote: 'Completed discovery call. VP confirmed budget is allocated for Q3 rollout.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000002',
      dealId: '70000000-0000-4000-8000-000000000026',
      title: 'Deliver formal technical architecture and data security brief',
      description: 'Detail HIPAA and GDPR zero-knowledge encryption safeguards.',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-08-16'),
      completedAt: new Date('2026-08-16T17:30:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep4_rohan,
          completedAt: new Date('2026-08-16T17:30:00.000Z'),
          completionNote: 'Architecture pack delivered and approved by InfoSec review board.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000003',
      dealId: '70000000-0000-4000-8000-000000000027', // Won Deal 27
      title: 'Schedule IoT vibration sensor hardware compatibility test',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep5_elena,
      dueDate: new Date('2026-08-20'),
      completedAt: new Date('2026-08-20T14:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep5_elena,
          completedAt: new Date('2026-08-20T14:00:00.000Z'),
          completionNote: 'Hardware test successful across all 4 machine shop CNC stations.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000004',
      dealId: '70000000-0000-4000-8000-000000000028', // Won Deal 28
      title: 'Confirm wealth management API security checklist',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep6_david,
      dueDate: new Date('2026-08-22'),
      completedAt: new Date('2026-08-22T16:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep6_david,
          completedAt: new Date('2026-08-22T16:00:00.000Z'),
          completionNote: 'SOC2 Type II attestation sent to CISO.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000005',
      dealId: '70000000-0000-4000-8000-000000000019', // Negotiation Deal 19
      title: 'Prepare joint proposal with collaborator review',
      description: 'Align software licensing tiers and onsite training schedule.',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-08-26'),
      completedAt: new Date('2026-08-26T18:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep4_rohan,
          completedAt: new Date('2026-08-26T17:30:00.000Z'),
          completionNote: 'Reviewed base software licensing terms.',
        },
        {
          userId: DEMO_USERS.rep5_elena,
          completedAt: new Date('2026-08-26T18:00:00.000Z'),
          completionNote: 'Added onboarding and field training schedule.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000006',
      dealId: '70000000-0000-4000-8000-000000000029', // Won Deal 29
      title: 'Review serverless autoscaling SLA metrics',
      priority: TaskPriority.LOW,
      createdById: BASELINE_USERS.rep1,
      dueDate: new Date('2026-09-02'),
      completedAt: new Date('2026-09-02T11:00:00.000Z'),
      assignees: [
        {
          userId: BASELINE_USERS.rep1,
          completedAt: new Date('2026-09-02T11:00:00.000Z'),
          completionNote: '99.99% uptime guarantee validated by infrastructure architects.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000007',
      dealId: '70000000-0000-4000-8000-000000000030', // Won Deal 30
      title: 'Verify multi-tenant SIEM integration endpoints',
      priority: TaskPriority.MEDIUM,
      createdById: BASELINE_USERS.rep3,
      dueDate: new Date('2026-08-12'),
      completedAt: new Date('2026-08-12T15:00:00.000Z'),
      assignees: [
        {
          userId: BASELINE_USERS.rep3,
          completedAt: new Date('2026-08-12T15:00:00.000Z'),
          completionNote: 'Splunk and Sentinel connectors configured and tested.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000008',
      dealId: '70000000-0000-4000-8000-000000000031', // Won Deal 31
      title: 'Send revised drone flight path telemetry quote',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep5_elena,
      dueDate: new Date('2026-09-05'),
      completedAt: new Date('2026-09-05T16:30:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep5_elena,
          completedAt: new Date('2026-09-05T16:30:00.000Z'),
          completionNote: 'Quote accepted by agricultural cooperative committee.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000009',
      dealId: '70000000-0000-4000-8000-000000000021', // Negotiation Deal 21
      title: 'Audit trading gateway sub-millisecond latencies',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep6_david,
      dueDate: new Date('2026-09-08'),
      completedAt: new Date('2026-09-08T12:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep6_david,
          completedAt: new Date('2026-09-08T12:00:00.000Z'),
          completionNote: 'P99 latency of 140 microseconds verified under stress load.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000010',
      dealId: '70000000-0000-4000-8000-000000000020', // Negotiation Deal 20
      title: 'Confirm edge gateway enclosure IP67 environmental ratings',
      priority: TaskPriority.LOW,
      createdById: DEMO_USERS.rep5_elena,
      dueDate: new Date('2026-09-09'),
      completedAt: new Date('2026-09-09T14:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep5_elena,
          completedAt: new Date('2026-09-09T14:00:00.000Z'),
          completionNote: 'Certificates forwarded to plant operations manager.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000011',
      dealId: '70000000-0000-4000-8000-000000000011', // Proposal Deal 11
      title: 'Draft bio-repository barcoding data dictionary',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-09-10'),
      completedAt: new Date('2026-09-10T16:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep4_rohan,
          completedAt: new Date('2026-09-10T16:00:00.000Z'),
          completionNote: 'Standard 2D DataMatrix format agreed upon.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000012',
      dealId: '70000000-0000-4000-8000-000000000012', // Proposal Deal 12
      title: 'Run baseline predictive model on historical vibration logs',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep5_elena,
      dueDate: new Date('2026-09-11'),
      completedAt: new Date('2026-09-11T17:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep5_elena,
          completedAt: new Date('2026-09-11T17:00:00.000Z'),
          completionNote: 'Model detected 94% of synthetic bearing wear anomalies.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000013',
      dealId: '70000000-0000-4000-8000-000000000013', // Proposal Deal 13
      title: 'Validate FIX protocol trade feed schema',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep6_david,
      dueDate: new Date('2026-09-12'),
      completedAt: new Date('2026-09-12T13:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep6_david,
          completedAt: new Date('2026-09-12T13:00:00.000Z'),
          completionNote: 'FIX 4.4 and 5.0 SP2 compatibility confirmed.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000014',
      dealId: '70000000-0000-4000-8000-000000000014', // Proposal Deal 14
      title: 'Review database replication lag mitigation roadmap',
      priority: TaskPriority.MEDIUM,
      createdById: BASELINE_USERS.rep1,
      dueDate: new Date('2026-09-12'),
      completedAt: new Date('2026-09-12T15:30:00.000Z'),
      assignees: [
        {
          userId: BASELINE_USERS.rep1,
          completedAt: new Date('2026-09-12T15:30:00.000Z'),
          completionNote: 'Logical replication with active-active read replicas approved.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000015',
      dealId: '70000000-0000-4000-8000-000000000015', // Proposal Deal 15
      title: 'Verify customs clearance EDI standard 315/214 format',
      priority: TaskPriority.LOW,
      createdById: BASELINE_USERS.rep2,
      dueDate: new Date('2026-09-13'),
      completedAt: new Date('2026-09-13T10:00:00.000Z'),
      assignees: [
        {
          userId: BASELINE_USERS.rep2,
          completedAt: new Date('2026-09-13T10:00:00.000Z'),
          completionNote: 'EDI mapping specifications validated against port authority gateway.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000016',
      dealId: '70000000-0000-4000-8000-000000000022', // Negotiation Deal 22
      title: 'Review commercial lease energy rebate terms with Priya',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep6_david,
      dueDate: new Date('2026-09-13'),
      completedAt: new Date('2026-09-13T16:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep6_david,
          completedAt: new Date('2026-09-13T16:00:00.000Z'),
          completionNote: 'LEED certification rebate structure finalized.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000017',
      dealId: '70000000-0000-4000-8000-000000000023', // Negotiation Deal 23
      title: 'Deliver calibration telemetry SDK documentation',
      priority: TaskPriority.LOW,
      createdById: BASELINE_USERS.rep2,
      dueDate: new Date('2026-09-13'),
      completedAt: new Date('2026-09-13T17:00:00.000Z'),
      assignees: [
        {
          userId: BASELINE_USERS.rep2,
          completedAt: new Date('2026-09-13T17:00:00.000Z'),
          completionNote: 'Python and REST API reference documentation delivered.',
        },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000018',
      dealId: '70000000-0000-4000-8000-000000000017', // Proposal Deal 17
      title: 'Finalize camera vision sorting accuracy benchmark',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-09-13'),
      completedAt: new Date('2026-09-13T18:00:00.000Z'),
      assignees: [
        {
          userId: DEMO_USERS.rep4_rohan,
          completedAt: new Date('2026-09-13T18:00:00.000Z'),
          completionNote: '99.8% precision achieved at 120 items per minute.',
        },
      ],
    },

    // --- OPEN TASKS: DUE TODAY (5 tasks on 2026-09-14) ---
    {
      id: '80000000-0000-4000-8000-000000000019',
      dealId: '70000000-0000-4000-8000-000000000019', // Negotiation Deal 19
      title: 'Finalize LIMS master service agreement terms with Legal',
      description: 'Review indemnity caps and multi-year payment schedule with General Counsel.',
      priority: TaskPriority.HIGH,
      createdById: BASELINE_USERS.manager,
      dueDate: new Date('2026-09-14'),
      completedAt: null,
      assignees: [
        { userId: DEMO_USERS.rep4_rohan, completedAt: null, completionNote: null },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000020',
      dealId: '70000000-0000-4000-8000-000000000020', // Negotiation Deal 20
      title: 'Executive sponsor sync on turbine edge license contract',
      description: 'Align on Year 1 hardware warranty and software support tiers.',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep5_elena,
      dueDate: new Date('2026-09-14'),
      completedAt: null,
      assignees: [
        { userId: DEMO_USERS.rep5_elena, completedAt: null, completionNote: null },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000021',
      dealId: '70000000-0000-4000-8000-000000000021', // Negotiation Deal 21
      title: 'Confirm low-latency co-location rack space with David and Rohan',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep6_david,
      dueDate: new Date('2026-09-14'),
      completedAt: null,
      assignees: [
        { userId: DEMO_USERS.rep6_david, completedAt: null, completionNote: null },
        { userId: DEMO_USERS.rep4_rohan, completedAt: null, completionNote: null },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000022',
      dealId: '70000000-0000-4000-8000-000000000015', // Proposal Deal 15
      title: 'Send formal EDI freight tracking proposal document',
      priority: TaskPriority.HIGH,
      createdById: BASELINE_USERS.rep2,
      dueDate: new Date('2026-09-14'),
      completedAt: null,
      assignees: [
        { userId: BASELINE_USERS.rep2, completedAt: null, completionNote: null },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000023',
      dealId: '70000000-0000-4000-8000-000000000014', // Proposal Deal 14
      title: 'Send zero-downtime database rollout roadmap to Alex',
      priority: TaskPriority.MEDIUM,
      createdById: BASELINE_USERS.rep1,
      dueDate: new Date('2026-09-14'),
      completedAt: null,
      assignees: [
        { userId: BASELINE_USERS.rep1, completedAt: null, completionNote: null },
      ],
    },

    // --- OPEN TASKS: UPCOMING (17 tasks across Sept/Oct 2026) ---
    {
      id: '80000000-0000-4000-8000-000000000024',
      dealId: '70000000-0000-4000-8000-000000000011',
      title: 'Schedule product demo for bio-repository sample software',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-09-18'),
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep4_rohan, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000025',
      dealId: '70000000-0000-4000-8000-000000000012',
      title: 'Review predictive maintenance pricing discount tiers',
      priority: TaskPriority.LOW,
      createdById: DEMO_USERS.rep5_elena,
      dueDate: new Date('2026-09-20'),
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep5_elena, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000026',
      dealId: '70000000-0000-4000-8000-000000000013',
      title: 'Deliver executive summary for trade reconciliation suite',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep6_david,
      dueDate: new Date('2026-09-22'),
      completedAt: null,
      assignees: [
        { userId: DEMO_USERS.rep6_david, completedAt: null, completionNote: null },
        { userId: BASELINE_USERS.rep3, completedAt: null, completionNote: null },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000027',
      dealId: '70000000-0000-4000-8000-000000000016',
      title: 'Review SOC2 automation audit scope with Marcus',
      priority: TaskPriority.MEDIUM,
      createdById: BASELINE_USERS.rep3,
      dueDate: new Date('2026-09-25'),
      completedAt: null,
      assignees: [{ userId: BASELINE_USERS.rep3, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000028',
      dealId: '70000000-0000-4000-8000-000000000017',
      title: 'Coordinate live factory demonstration of vision sorter',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-09-26'),
      completedAt: null,
      assignees: [
        { userId: DEMO_USERS.rep4_rohan, completedAt: null, completionNote: null },
        { userId: DEMO_USERS.rep5_elena, completedAt: null, completionNote: null },
      ],
    },
    {
      id: '80000000-0000-4000-8000-000000000029',
      dealId: '70000000-0000-4000-8000-000000000022',
      title: 'Procurement follow-up on building management contract',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep6_david,
      dueDate: new Date('2026-09-27'),
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep6_david, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000030',
      dealId: '70000000-0000-4000-8000-000000000023',
      title: 'Contract review for lab telemetry multi-year renewal',
      priority: TaskPriority.MEDIUM,
      createdById: BASELINE_USERS.rep2,
      dueDate: new Date('2026-09-28'),
      completedAt: null,
      assignees: [{ userId: BASELINE_USERS.rep2, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000031',
      dealId: '70000000-0000-4000-8000-000000000001',
      title: 'Initial scoping session with clinical trial directors',
      priority: TaskPriority.LOW,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-10-02'),
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep4_rohan, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000032',
      dealId: '70000000-0000-4000-8000-000000000002',
      title: 'Portfolio risk engine technical feasibility review',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep6_david,
      dueDate: new Date('2026-10-05'),
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep6_david, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000033',
      dealId: '70000000-0000-4000-8000-000000000003',
      title: 'Palletizing robot safety standard certification check',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-10-08'),
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep4_rohan, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000034',
      dealId: '70000000-0000-4000-8000-000000000004',
      title: 'Field testing plan for irrigation telemetry hub',
      priority: TaskPriority.LOW,
      createdById: DEMO_USERS.rep5_elena,
      dueDate: new Date('2026-10-10'),
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep5_elena, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000035',
      dealId: '70000000-0000-4000-8000-000000000005',
      title: 'Send telemetry node quote to refinery purchasing lead',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep5_elena,
      dueDate: new Date('2026-10-12'),
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep5_elena, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000036',
      dealId: '70000000-0000-4000-8000-000000000006',
      title: 'Multi-region mesh load testing alignment call',
      priority: TaskPriority.HIGH,
      createdById: BASELINE_USERS.rep1,
      dueDate: new Date('2026-10-15'),
      completedAt: null,
      assignees: [{ userId: BASELINE_USERS.rep1, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000037',
      dealId: '70000000-0000-4000-8000-000000000007',
      title: 'Vessel tracking simulation presentation',
      priority: TaskPriority.MEDIUM,
      createdById: BASELINE_USERS.rep2,
      dueDate: new Date('2026-10-18'),
      completedAt: null,
      assignees: [{ userId: BASELINE_USERS.rep2, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000038',
      dealId: '70000000-0000-4000-8000-000000000008',
      title: 'Zero-trust governance IAM integration review',
      priority: TaskPriority.HIGH,
      createdById: BASELINE_USERS.rep3,
      dueDate: new Date('2026-10-20'),
      completedAt: null,
      assignees: [{ userId: BASELINE_USERS.rep3, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000039',
      dealId: '70000000-0000-4000-8000-000000000009',
      title: 'Mobile app feature sprint review with tenant advisory group',
      priority: TaskPriority.LOW,
      createdById: DEMO_USERS.rep6_david,
      dueDate: new Date('2026-10-22'),
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep6_david, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000040',
      dealId: '70000000-0000-4000-8000-000000000010',
      title: 'Spectrometer data sync API benchmark verification',
      priority: TaskPriority.MEDIUM,
      createdById: BASELINE_USERS.rep2,
      dueDate: new Date('2026-10-25'),
      completedAt: null,
      assignees: [{ userId: BASELINE_USERS.rep2, completedAt: null, completionNote: null }],
    },

    // --- OPEN TASKS: OVERDUE (4 tasks) ---
    {
      id: '80000000-0000-4000-8000-000000000041',
      dealId: '70000000-0000-4000-8000-000000000018', // Overdue Proposal Deal 18
      title: 'Follow up on soil telemetry hub pilot feedback',
      description: 'Customer requested updated sensor battery life specifications.',
      priority: TaskPriority.HIGH,
      createdById: DEMO_USERS.rep5_elena,
      dueDate: new Date('2026-09-03'), // Overdue task
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep5_elena, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000042',
      dealId: '70000000-0000-4000-8000-000000000024', // Overdue Negotiation Deal 24
      title: 'Resolve port terminal API SLA concerns with Priya',
      priority: TaskPriority.HIGH,
      createdById: BASELINE_USERS.manager,
      dueDate: new Date('2026-09-07'), // Overdue task
      completedAt: null,
      assignees: [{ userId: BASELINE_USERS.rep2, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000043',
      dealId: '70000000-0000-4000-8000-000000000025', // Overdue Negotiation Deal 25
      title: 'Deliver revised conveyor retrofit mechanical drawings',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-09-05'), // Overdue task
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep4_rohan, completedAt: null, completionNote: null }],
    },
    {
      id: '80000000-0000-4000-8000-000000000044',
      dealId: '70000000-0000-4000-8000-000000000019', // Negotiation Deal 19
      title: 'Schedule executive pricing sign-off meeting with Sarah',
      priority: TaskPriority.MEDIUM,
      createdById: DEMO_USERS.rep4_rohan,
      dueDate: new Date('2026-09-09'), // Overdue task
      completedAt: null,
      assignees: [{ userId: DEMO_USERS.rep4_rohan, completedAt: null, completionNote: null }],
    },
  ];

  for (const t of demoTasksData) {
    const primaryAssigneeId = t.assignees[0]?.userId ?? t.createdById;

    await prisma.task.upsert({
      where: { id: t.id },
      update: {
        teamId: TEAM_ID,
        dealId: t.dealId,
        title: t.title,
        description: t.description ?? null,
        priority: t.priority,
        createdById: t.createdById,
        assignedToId: primaryAssigneeId,
        dueDate: t.dueDate,
        completedAt: t.completedAt ?? null,
        deletedAt: null,
        deletedById: null,
      },
      create: {
        id: t.id,
        teamId: TEAM_ID,
        dealId: t.dealId,
        title: t.title,
        description: t.description ?? null,
        priority: t.priority,
        createdById: t.createdById,
        assignedToId: primaryAssigneeId,
        dueDate: t.dueDate,
        completedAt: t.completedAt ?? null,
      },
    });

    // Seed TaskAssignee records
    for (const a of t.assignees) {
      await prisma.taskAssignee.upsert({
        where: { taskId_userId: { taskId: t.id, userId: a.userId } },
        update: {
          completedAt: a.completedAt ?? null,
          completionNote: a.completionNote ?? null,
        },
        create: {
          taskId: t.id,
          userId: a.userId,
          completedAt: a.completedAt ?? null,
          completionNote: a.completionNote ?? null,
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 7. Demo Overdue Deal Alerts (6 total: 4 active, 2 dismissed)
  // --------------------------------------------------------------------------
  console.log('🚨 Seeding Demo Deal Alerts...');

  const demoAlertsData = [
    // Alert 1: Overdue Deal 18 for Elena (Active)
    {
      id: '95000000-0000-4000-8000-000000000001',
      dealId: '70000000-0000-4000-8000-000000000018',
      notificationId: '90000000-0000-4000-8000-000000000001',
      userId: DEMO_USERS.rep5_elena,
      dismissedCloseDate: null,
      dismissedAt: null,
      readAt: null, // Unread alert
      title: 'Deal Overdue: Soil Nutrient Telemetry Hub',
      message: 'Expected close date (2026-09-02) has passed. Please update the expected close date or stage.',
      createdAt: new Date('2026-09-03T08:00:00.000Z'),
    },
    // Alert 2: Overdue Deal 24 for Priya (Active)
    {
      id: '95000000-0000-4000-8000-000000000002',
      dealId: '70000000-0000-4000-8000-000000000024',
      notificationId: '90000000-0000-4000-8000-000000000002',
      userId: BASELINE_USERS.rep2,
      dismissedCloseDate: null,
      dismissedAt: null,
      readAt: null, // Unread alert
      title: 'Deal Overdue: Fleet Port Terminal API Licensing',
      message: 'Expected close date (2026-09-08) has passed. Please update the expected close date or stage.',
      createdAt: new Date('2026-09-09T08:00:00.000Z'),
    },
    // Alert 3: Overdue Deal 25 for Rohan (Active)
    {
      id: '95000000-0000-4000-8000-000000000003',
      dealId: '70000000-0000-4000-8000-000000000025',
      notificationId: '90000000-0000-4000-8000-000000000003',
      userId: DEMO_USERS.rep4_rohan,
      dismissedCloseDate: null,
      dismissedAt: null,
      readAt: new Date('2026-09-08T10:00:00.000Z'), // Read active alert
      title: 'Deal Overdue: Automated Conveyor Retrofit Contract',
      message: 'Expected close date (2026-09-06) has passed. Please update the expected close date or stage.',
      createdAt: new Date('2026-09-07T08:00:00.000Z'),
    },
    // Alert 4: Overdue Deal 25 for Sarah Jenkins (Manager active view)
    {
      id: '95000000-0000-4000-8000-000000000004',
      dealId: '70000000-0000-4000-8000-000000000025',
      notificationId: '90000000-0000-4000-8000-000000000004',
      userId: BASELINE_USERS.manager,
      dismissedCloseDate: null,
      dismissedAt: null,
      readAt: null,
      title: 'Team Deal Overdue: Automated Conveyor Retrofit Contract',
      message: 'Deal owned by Rohan Mehta is overdue past 2026-09-06.',
      createdAt: new Date('2026-09-07T08:00:00.000Z'),
    },
    // Alert 5: Dismissed Alert on Deal 18 for Sarah (Dismissed)
    {
      id: '95000000-0000-4000-8000-000000000005',
      dealId: '70000000-0000-4000-8000-000000000018',
      notificationId: '90000000-0000-4000-8000-000000000005',
      userId: BASELINE_USERS.manager,
      dismissedCloseDate: new Date('2026-09-02'),
      dismissedAt: new Date('2026-09-04T12:00:00.000Z'),
      readAt: new Date('2026-09-04T12:00:00.000Z'),
      title: 'Team Deal Overdue: Soil Nutrient Telemetry Hub',
      message: 'Dismissed by manager for current date cycle.',
      createdAt: new Date('2026-09-03T08:00:00.000Z'),
    },
    // Alert 6: Dismissed Alert on Deal 24 for Priya (Dismissed)
    {
      id: '95000000-0000-4000-8000-000000000006',
      dealId: '70000000-0000-4000-8000-000000000024',
      notificationId: '90000000-0000-4000-8000-000000000006',
      userId: BASELINE_USERS.rep2,
      dismissedCloseDate: new Date('2026-09-08'),
      dismissedAt: new Date('2026-09-10T14:00:00.000Z'),
      readAt: new Date('2026-09-10T14:00:00.000Z'),
      title: 'Deal Overdue: Fleet Port Terminal API Licensing',
      message: 'Dismissed by rep.',
      createdAt: new Date('2026-09-09T08:00:00.000Z'),
    },
  ];

  for (const a of demoAlertsData) {
    // Create corresponding notification
    await prisma.notification.upsert({
      where: { id: a.notificationId },
      update: {
        userId: a.userId,
        dealId: a.dealId,
        type: NotificationType.DEAL_OVERDUE,
        title: a.title,
        message: a.message,
        readAt: a.readAt,
        createdAt: a.createdAt,
      },
      create: {
        id: a.notificationId,
        userId: a.userId,
        dealId: a.dealId,
        type: NotificationType.DEAL_OVERDUE,
        title: a.title,
        message: a.message,
        readAt: a.readAt,
        createdAt: a.createdAt,
      },
    });

    // Check if DealAlert already exists for this deal (one DealAlert per deal)
    const existingAlert = await prisma.dealAlert.findUnique({ where: { dealId: a.dealId } });
    if (!existingAlert) {
      await prisma.dealAlert.create({
        data: {
          id: a.id,
          notificationId: a.notificationId,
          dealId: a.dealId,
          dismissedCloseDate: a.dismissedCloseDate,
          dismissedAt: a.dismissedAt,
          createdAt: a.createdAt,
        },
      });
    } else {
      await prisma.dealAlert.update({
        where: { id: existingAlert.id },
        data: {
          dismissedCloseDate: a.dismissedCloseDate,
          dismissedAt: a.dismissedAt,
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 8. Demo In-App Notifications (72 realistic activity notifications across all users)
  // --------------------------------------------------------------------------
  console.log('🔔 Seeding Demo Activity Notifications...');

  const usersList = [
    BASELINE_USERS.manager,
    BASELINE_USERS.rep1,
    BASELINE_USERS.rep2,
    BASELINE_USERS.rep3,
    DEMO_USERS.rep4_rohan,
    DEMO_USERS.rep5_elena,
    DEMO_USERS.rep6_david,
  ];

  const notificationTemplates = [
    {
      type: NotificationType.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: 'You were assigned to "Finalize LIMS master service agreement terms with Legal".',
      dealId: '70000000-0000-4000-8000-000000000019',
    },
    {
      type: NotificationType.TASK_COMPLETED,
      title: 'Task Completed',
      message: 'Rohan completed "Prepare joint proposal with collaborator review": Reviewed base software licensing terms.',
      dealId: '70000000-0000-4000-8000-000000000019',
    },
    {
      type: NotificationType.DEAL_STAGE_ADVANCED,
      title: 'Deal Advanced to Negotiation',
      message: 'Enterprise LIMS Integration Contract has progressed to Negotiation stage (70% win probability).',
      dealId: '70000000-0000-4000-8000-000000000019',
    },
    {
      type: NotificationType.DEAL_WON,
      title: 'Deal Won! 🎉',
      message: 'Genomics Data Warehouse Expansion (₹4,80,000.00) was marked as WON by Rohan Mehta.',
      dealId: '70000000-0000-4000-8000-000000000026',
    },
    {
      type: NotificationType.DEAL_WON,
      title: 'Deal Won! 🎉',
      message: 'Factory-Wide IoT Gateway Deployment (₹3,90,000.00) was marked as WON by Elena Rostova.',
      dealId: '70000000-0000-4000-8000-000000000027',
    },
    {
      type: NotificationType.COLLABORATOR_ADDED,
      title: 'Added as Collaborator',
      message: 'Elena Rostova added you as a collaborator on "Turbine Edge Computing Licenses".',
      dealId: '70000000-0000-4000-8000-000000000020',
    },
    {
      type: NotificationType.NOTE_ADDED,
      title: 'Note Added to Deal',
      message: 'David Kim left a note: "P99 latency benchmarks sent to hedge fund execution committee."',
      dealId: '70000000-0000-4000-8000-000000000021',
    },
    {
      type: NotificationType.DEAL_STAGE_ADVANCED,
      title: 'Deal Advanced to Proposal',
      message: 'Algorithmic Trade Reconciliation advanced to Proposal stage (50% win probability).',
      dealId: '70000000-0000-4000-8000-000000000013',
    },
    {
      type: NotificationType.TASK_COMPLETED,
      title: 'Task Completed',
      message: 'Elena completed "Audit trading gateway sub-millisecond latencies".',
      dealId: '70000000-0000-4000-8000-000000000020',
    },
    {
      type: NotificationType.DEAL_LOST,
      title: 'Deal Marked as Lost',
      message: 'Smart Metering Power Grid Subsystem was marked as Lost: Competitor offered hardware bundle.',
      dealId: '70000000-0000-4000-8000-000000000032',
    },
  ];

  let notifCounter = 10;
  for (let uIdx = 0; uIdx < usersList.length; uIdx++) {
    const targetUserId = usersList[uIdx];
    // Create ~10 notifications per user (7 users * ~10 = 70 notifications)
    for (let tIdx = 0; tIdx < notificationTemplates.length; tIdx++) {
      notifCounter++;
      const template = notificationTemplates[tIdx];
      const notifId = `90000000-0000-4000-8000-${String(notifCounter).padStart(12, '0')}`;
      
      // Calculate realistic date between Aug 25 and Sept 14, 2026
      const dayOffset = (uIdx * 3 + tIdx * 2) % 18;
      const hourOffset = (uIdx * 4 + tIdx * 3) % 24;
      const createdAt = new Date(Date.UTC(2026, 7, 26 + dayOffset, hourOffset, 15, 0));

      // ~70% read, ~30% unread
      const isRead = (uIdx + tIdx) % 3 !== 0;
      const readAt = isRead ? new Date(createdAt.getTime() + 1000 * 60 * 45) : null;

      await prisma.notification.upsert({
        where: { id: notifId },
        update: {
          userId: targetUserId,
          dealId: template.dealId,
          type: template.type,
          title: template.title,
          message: template.message,
          readAt,
          createdAt,
        },
        create: {
          id: notifId,
          userId: targetUserId,
          dealId: template.dealId,
          type: template.type,
          title: template.title,
          message: template.message,
          readAt,
          createdAt,
        },
      });
    }
  }

  console.log('✅ Demo Dataset successfully seeded!');
}

async function run() {
  try {
    await seedDemoDataset();
  } catch (error) {
    console.error('❌ Demo seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run();
}
