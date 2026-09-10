import { PrismaClient, UserRole, DealStage, HistoryType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================================
// Deterministic UUIDs for Idempotent Seeding
// ============================================================================

const ORG_ID = '00000000-0000-4000-8000-000000000001';
const TEAM_ID = '00000000-0000-4000-8000-000000000002';

const USER_MANAGER_ID = '10000000-0000-4000-8000-000000000001';
const USER_REP1_ID    = '10000000-0000-4000-8000-000000000002';
const USER_REP2_ID    = '10000000-0000-4000-8000-000000000003';
const USER_REP3_ID    = '10000000-0000-4000-8000-000000000004';

const COMPANIES = {
  acme:        '20000000-0000-4000-8000-000000000001',
  apex:        '20000000-0000-4000-8000-000000000002',
  stellar:     '20000000-0000-4000-8000-000000000003',
  zenith:      '20000000-0000-4000-8000-000000000004',
  horizon:     '20000000-0000-4000-8000-000000000005',
  vortex:      '20000000-0000-4000-8000-000000000006',
  beacon:      '20000000-0000-4000-8000-000000000007',
  legacyIron:  '20000000-0000-4000-8000-000000000008', // archived company
};

const DEALS = {
  d1_erp:            '30000000-0000-4000-8000-000000000001', // NEW
  d2_fleet:          '30000000-0000-4000-8000-000000000002', // QUALIFIED
  d3_cloud:          '30000000-0000-4000-8000-000000000003', // PROPOSAL (multiple collaborators)
  d4_health:         '30000000-0000-4000-8000-000000000004', // NEGOTIATION (backward transition in history)
  d5_pos:            '30000000-0000-4000-8000-000000000005', // WON
  d6_gateway:        '30000000-0000-4000-8000-000000000006', // LOST
  d7_grid:           '30000000-0000-4000-8000-000000000007', // NEW
  d8_sensor:         '30000000-0000-4000-8000-000000000008', // PROPOSAL
  d9_cyber:          '30000000-0000-4000-8000-000000000009', // QUALIFIED
  d10_ecommerce:     '30000000-0000-4000-8000-000000000010', // NEGOTIATION (reassigned owner)
  d11_ehr:           '30000000-0000-4000-8000-000000000011', // WON
  d12_safety:        '30000000-0000-4000-8000-000000000012', // LOST
  d13_reopened:      '30000000-0000-4000-8000-000000000013', // REOPENED (closed as LOST then reopened by Manager)
  d14_overdueActive: '30000000-0000-4000-8000-000000000014', // Overdue (no dismissal)
  d15_overdueDism:   '30000000-0000-4000-8000-000000000015', // Overdue with dismissed alert
  d16_backupPower:   '30000000-0000-4000-8000-000000000016', // QUALIFIED
  d17_reconcile:     '30000000-0000-4000-8000-000000000017', // PROPOSAL
  d18_softDeleted:   '30000000-0000-4000-8000-000000000018', // SOFT-DELETED in Trash!
};

async function main() {
  console.log('🌱 Starting database seed...');

  // --------------------------------------------------------------------------
  // 1. Organization & Team
  // --------------------------------------------------------------------------
  console.log('🏢 Seeding Organization & Team...');
  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: 'Busy Infotech' },
    create: {
      id: ORG_ID,
      name: 'Busy Infotech',
    },
  });

  const team = await prisma.team.upsert({
    where: { id: TEAM_ID },
    update: { name: 'Enterprise Sales Team', organizationId: org.id },
    create: {
      id: TEAM_ID,
      organizationId: org.id,
      name: 'Enterprise Sales Team',
    },
  });

  // --------------------------------------------------------------------------
  // 2. Users (1 Manager + 3 Sales Reps)
  // Demo password for all: Password123!
  // --------------------------------------------------------------------------
  console.log('👤 Seeding Users...');
  const passwordHash = bcrypt.hashSync('Password123!', 10);

  const usersData = [
    {
      id: USER_MANAGER_ID,
      name: 'Sarah Jenkins',
      email: 'manager@busy.com',
      role: UserRole.MANAGER,
    },
    {
      id: USER_REP1_ID,
      name: 'Alex Rivera',
      email: 'alex@busy.com',
      role: UserRole.SALES_REP,
    },
    {
      id: USER_REP2_ID,
      name: 'Priya Sharma',
      email: 'priya@busy.com',
      role: UserRole.SALES_REP,
    },
    {
      id: USER_REP3_ID,
      name: 'Marcus Chen',
      email: 'marcus@busy.com',
      role: UserRole.SALES_REP,
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        organizationId: org.id,
        teamId: team.id,
      },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        organizationId: org.id,
        teamId: team.id,
      },
    });
  }

  // --------------------------------------------------------------------------
  // 3. Companies (8 companies across multiple industries, 1 archived)
  // --------------------------------------------------------------------------
  console.log('🏬 Seeding Companies...');
  const companiesData = [
    {
      id: COMPANIES.acme,
      teamId: team.id,
      ownerId: USER_REP1_ID,
      name: 'Acme Corp',
      industry: 'Manufacturing',
      website: 'https://acme.example.com',
      isArchived: false,
    },
    {
      id: COMPANIES.apex,
      teamId: team.id,
      ownerId: USER_REP2_ID,
      name: 'Apex Global Logistics',
      industry: 'Logistics & Supply Chain',
      website: 'https://apexlogistics.example.com',
      isArchived: false,
    },
    {
      id: COMPANIES.stellar,
      teamId: team.id,
      ownerId: USER_REP3_ID,
      name: 'Stellar Cloud Systems',
      industry: 'Enterprise Software',
      website: 'https://stellarcloud.example.com',
      isArchived: false,
    },
    {
      id: COMPANIES.zenith,
      teamId: team.id,
      ownerId: USER_REP1_ID,
      name: 'Zenith Healthcare Solutions',
      industry: 'Healthcare',
      website: 'https://zenithhealth.example.com',
      isArchived: false,
    },
    {
      id: COMPANIES.horizon,
      teamId: team.id,
      ownerId: USER_REP2_ID,
      name: 'Horizon Retail Group',
      industry: 'Retail & E-commerce',
      website: 'https://horizonretail.example.com',
      isArchived: false,
    },
    {
      id: COMPANIES.vortex,
      teamId: team.id,
      ownerId: USER_REP3_ID,
      name: 'Vortex Financial Technologies',
      industry: 'Fintech',
      website: 'https://vortexfintech.example.com',
      isArchived: false,
    },
    {
      id: COMPANIES.beacon,
      teamId: team.id,
      ownerId: USER_REP1_ID,
      name: 'Beacon Clean Energy',
      industry: 'Renewable Energy',
      website: 'https://beaconenergy.example.com',
      isArchived: false,
    },
    {
      id: COMPANIES.legacyIron,
      teamId: team.id,
      ownerId: USER_REP3_ID,
      name: 'Legacy Ironworks Inc',
      industry: 'Heavy Manufacturing',
      website: 'https://legacyiron.example.com',
      isArchived: true, // Archived company example
    },
  ];

  for (const c of companiesData) {
    await prisma.company.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }

  // --------------------------------------------------------------------------
  // 4. Deals (18 deals across all stages, exact decimals, calendar DATE close dates)
  // --------------------------------------------------------------------------
  console.log('💼 Seeding Deals...');
  const dealsData = [
    {
      id: DEALS.d1_erp,
      teamId: team.id,
      companyId: COMPANIES.acme,
      ownerId: USER_REP1_ID,
      title: 'Global Supply ERP Rollout',
      value: '125000.00',
      expectedCloseDate: new Date('2026-11-15'),
      stage: DealStage.NEW,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d2_fleet,
      teamId: team.id,
      companyId: COMPANIES.apex,
      ownerId: USER_REP2_ID,
      title: 'Fleet Tracking System Upgrade',
      value: '84000.00',
      expectedCloseDate: new Date('2026-12-01'),
      stage: DealStage.QUALIFIED,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d3_cloud,
      teamId: team.id,
      companyId: COMPANIES.stellar,
      ownerId: USER_REP3_ID,
      title: 'Multi-Cloud Migration Advisory',
      value: '240000.00',
      expectedCloseDate: new Date('2026-10-30'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d4_health,
      teamId: team.id,
      companyId: COMPANIES.zenith,
      ownerId: USER_REP1_ID,
      title: 'Hospital Management Core Suite',
      value: '350000.00',
      expectedCloseDate: new Date('2026-10-15'),
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d5_pos,
      teamId: team.id,
      companyId: COMPANIES.horizon,
      ownerId: USER_REP2_ID,
      title: 'Omnichannel POS Integration',
      value: '195000.00',
      expectedCloseDate: new Date('2026-08-20'),
      stage: DealStage.WON,
      closedAt: new Date('2026-08-20T16:00:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d6_gateway,
      teamId: team.id,
      companyId: COMPANIES.vortex,
      ownerId: USER_REP3_ID,
      title: 'Payment Gateway Microservices',
      value: '160000.00',
      expectedCloseDate: new Date('2026-07-15'),
      stage: DealStage.LOST,
      closedAt: new Date('2026-07-15T11:30:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d7_grid,
      teamId: team.id,
      companyId: COMPANIES.beacon,
      ownerId: USER_REP1_ID,
      title: 'Smart Grid Analytics Pilot',
      value: '95000.00',
      expectedCloseDate: new Date('2026-11-30'),
      stage: DealStage.NEW,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d8_sensor,
      teamId: team.id,
      companyId: COMPANIES.apex,
      ownerId: USER_REP2_ID,
      title: 'Warehouse Automation Sensor Mesh',
      value: '145000.00',
      expectedCloseDate: new Date('2026-10-25'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d9_cyber,
      teamId: team.id,
      companyId: COMPANIES.vortex,
      ownerId: USER_REP3_ID,
      title: 'Cybersecurity Compliance Audit',
      value: '68000.00',
      expectedCloseDate: new Date('2026-12-15'),
      stage: DealStage.QUALIFIED,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d10_ecommerce,
      teamId: team.id,
      companyId: COMPANIES.horizon,
      ownerId: USER_REP2_ID, // Reassigned to Priya
      title: 'E-Commerce Recommendation Engine',
      value: '110000.00',
      expectedCloseDate: new Date('2026-10-10'),
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d11_ehr,
      teamId: team.id,
      companyId: COMPANIES.zenith,
      ownerId: USER_REP1_ID,
      title: 'Electronic Health Records Portal',
      value: '280000.00',
      expectedCloseDate: new Date('2026-08-30'),
      stage: DealStage.WON,
      closedAt: new Date('2026-08-30T17:45:00.000Z'),
      previousStage: DealStage.NEGOTIATION,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d12_safety,
      teamId: team.id,
      companyId: COMPANIES.acme,
      ownerId: USER_REP1_ID,
      title: 'Plant Safety Telemetry',
      value: '52000.00',
      expectedCloseDate: new Date('2026-08-05'),
      stage: DealStage.LOST,
      closedAt: new Date('2026-08-05T14:20:00.000Z'),
      previousStage: DealStage.PROPOSAL,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d13_reopened,
      teamId: team.id,
      companyId: COMPANIES.stellar,
      ownerId: USER_REP3_ID,
      title: 'Reopened Enterprise Cloud Expansion',
      value: '310000.00',
      expectedCloseDate: new Date('2026-10-20'),
      stage: DealStage.NEGOTIATION,
      closedAt: null, // Reopened!
      previousStage: DealStage.NEGOTIATION,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d14_overdueActive,
      teamId: team.id,
      companyId: COMPANIES.acme,
      ownerId: USER_REP1_ID,
      title: 'Overdue Live Deal - Stalled Negotiation',
      value: '75000.00',
      expectedCloseDate: new Date('2026-09-01'), // Overdue date
      stage: DealStage.NEGOTIATION,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d15_overdueDism,
      teamId: team.id,
      companyId: COMPANIES.beacon,
      ownerId: USER_REP1_ID,
      title: 'Overdue Deal with Dismissed Alert',
      value: '88000.00',
      expectedCloseDate: new Date('2026-09-05'), // Overdue date
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d16_backupPower,
      teamId: team.id,
      companyId: COMPANIES.beacon,
      ownerId: USER_REP2_ID,
      title: 'Backup Power Infrastructure',
      value: '130000.00',
      expectedCloseDate: new Date('2026-11-20'),
      stage: DealStage.QUALIFIED,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d17_reconcile,
      teamId: team.id,
      companyId: COMPANIES.vortex,
      ownerId: USER_REP3_ID,
      title: 'Automated Reconciliation Engine',
      value: '215000.00',
      expectedCloseDate: new Date('2026-10-18'),
      stage: DealStage.PROPOSAL,
      closedAt: null,
      previousStage: null,
      deletedAt: null,
      deletedById: null,
    },
    {
      id: DEALS.d18_softDeleted,
      teamId: team.id,
      companyId: COMPANIES.apex,
      ownerId: USER_REP2_ID,
      title: 'Soft-Deleted Erroneous Proposal',
      value: '45000.00',
      expectedCloseDate: new Date('2026-11-01'),
      stage: DealStage.NEW,
      closedAt: null,
      previousStage: null,
      deletedAt: new Date('2026-09-08T10:15:00.000Z'),
      deletedById: USER_REP2_ID, // Priya Sharma soft-deleted this deal
    },
  ];

  for (const d of dealsData) {
    await prisma.deal.upsert({
      where: { id: d.id },
      update: d,
      create: d,
    });
  }

  // --------------------------------------------------------------------------
  // 5. Deal Collaborators
  // Multiple deals with collaborators; Deal 3 has multiple collaborators
  // --------------------------------------------------------------------------
  console.log('🤝 Seeding Collaborators...');
  const collaboratorsData = [
    // Deal 3 (Owner: Marcus Chen) -> Collaborators: Alex Rivera & Priya Sharma
    { dealId: DEALS.d3_cloud, userId: USER_REP1_ID },
    { dealId: DEALS.d3_cloud, userId: USER_REP2_ID },

    // Deal 4 (Owner: Alex Rivera) -> Collaborator: Priya Sharma
    { dealId: DEALS.d4_health, userId: USER_REP2_ID },

    // Deal 8 (Owner: Priya Sharma) -> Collaborator: Marcus Chen
    { dealId: DEALS.d8_sensor, userId: USER_REP3_ID },

    // Deal 10 (Owner: Priya Sharma) -> Collaborator: Alex Rivera
    { dealId: DEALS.d10_ecommerce, userId: USER_REP1_ID },

    // Deal 13 (Owner: Marcus Chen) -> Collaborator: Alex Rivera
    { dealId: DEALS.d13_reopened, userId: USER_REP1_ID },
  ];

  for (const c of collaboratorsData) {
    await prisma.dealCollaborator.upsert({
      where: { dealId_userId: { dealId: c.dealId, userId: c.userId } },
      update: {},
      create: c,
    });
  }

  // --------------------------------------------------------------------------
  // 6. Deal History (Immutable Timelines)
  // Every deal has CREATED; includes backward transitions, reassignment, reopen, notes, and DELETED
  // --------------------------------------------------------------------------
  console.log('📜 Seeding Deal History Events...');

  // Helper to create or ensure history event
  const historyEvents = [
    // All deals: CREATED event
    { id: '40000000-0000-4000-8000-000000000001', dealId: DEALS.d1_erp, actorId: USER_REP1_ID, type: HistoryType.CREATED, createdAt: new Date('2026-08-01T09:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000002', dealId: DEALS.d2_fleet, actorId: USER_REP2_ID, type: HistoryType.CREATED, createdAt: new Date('2026-08-02T10:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000003', dealId: DEALS.d3_cloud, actorId: USER_REP3_ID, type: HistoryType.CREATED, createdAt: new Date('2026-08-03T11:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000004', dealId: DEALS.d4_health, actorId: USER_REP1_ID, type: HistoryType.CREATED, createdAt: new Date('2026-08-04T12:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000005', dealId: DEALS.d5_pos, actorId: USER_REP2_ID, type: HistoryType.CREATED, createdAt: new Date('2026-07-01T09:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000006', dealId: DEALS.d6_gateway, actorId: USER_REP3_ID, type: HistoryType.CREATED, createdAt: new Date('2026-06-15T09:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000007', dealId: DEALS.d7_grid, actorId: USER_REP1_ID, type: HistoryType.CREATED, createdAt: new Date('2026-08-10T14:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000008', dealId: DEALS.d8_sensor, actorId: USER_REP2_ID, type: HistoryType.CREATED, createdAt: new Date('2026-08-12T15:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000009', dealId: DEALS.d9_cyber, actorId: USER_REP3_ID, type: HistoryType.CREATED, createdAt: new Date('2026-08-15T16:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000010', dealId: DEALS.d10_ecommerce, actorId: USER_REP3_ID, type: HistoryType.CREATED, createdAt: new Date('2026-07-20T10:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000011', dealId: DEALS.d11_ehr, actorId: USER_REP1_ID, type: HistoryType.CREATED, createdAt: new Date('2026-07-10T11:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000012', dealId: DEALS.d12_safety, actorId: USER_REP1_ID, type: HistoryType.CREATED, createdAt: new Date('2026-07-12T12:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000013', dealId: DEALS.d13_reopened, actorId: USER_REP3_ID, type: HistoryType.CREATED, createdAt: new Date('2026-07-05T09:30:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000014', dealId: DEALS.d14_overdueActive, actorId: USER_REP1_ID, type: HistoryType.CREATED, createdAt: new Date('2026-07-25T13:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000015', dealId: DEALS.d15_overdueDism, actorId: USER_REP1_ID, type: HistoryType.CREATED, createdAt: new Date('2026-07-28T14:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000016', dealId: DEALS.d16_backupPower, actorId: USER_REP2_ID, type: HistoryType.CREATED, createdAt: new Date('2026-08-18T10:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000017', dealId: DEALS.d17_reconcile, actorId: USER_REP3_ID, type: HistoryType.CREATED, createdAt: new Date('2026-08-20T11:00:00.000Z') },
    { id: '40000000-0000-4000-8000-000000000018', dealId: DEALS.d18_softDeleted, actorId: USER_REP2_ID, type: HistoryType.CREATED, createdAt: new Date('2026-09-01T09:00:00.000Z') },

    // Deal 2 transitions: NEW -> QUALIFIED
    {
      id: '40000000-0000-4000-8000-000000000019',
      dealId: DEALS.d2_fleet,
      actorId: USER_REP2_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-08-05T10:30:00.000Z'),
    },

    // Deal 3 transitions: NEW -> QUALIFIED -> PROPOSAL + Note
    {
      id: '40000000-0000-4000-8000-000000000020',
      dealId: DEALS.d3_cloud,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-08-08T11:30:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000021',
      dealId: DEALS.d3_cloud,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.QUALIFIED,
      newStage: DealStage.PROPOSAL,
      createdAt: new Date('2026-08-15T14:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000022',
      dealId: DEALS.d3_cloud,
      actorId: USER_REP1_ID, // collaborator left note
      type: HistoryType.NOTE_ADDED,
      note: 'Client requested updated compliance certifications for SOC2 Type II.',
      createdAt: new Date('2026-08-18T16:20:00.000Z'),
    },

    // Deal 4 transitions: NEW -> QUALIFIED -> PROPOSAL -> NEGOTIATION -> (BACKWARD with reason) -> PROPOSAL -> NEGOTIATION
    {
      id: '40000000-0000-4000-8000-000000000023',
      dealId: DEALS.d4_health,
      actorId: USER_REP1_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-08-08T09:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000024',
      dealId: DEALS.d4_health,
      actorId: USER_REP1_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.QUALIFIED,
      newStage: DealStage.PROPOSAL,
      createdAt: new Date('2026-08-16T10:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000025',
      dealId: DEALS.d4_health,
      actorId: USER_REP1_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.PROPOSAL,
      newStage: DealStage.NEGOTIATION,
      createdAt: new Date('2026-08-25T11:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000026',
      dealId: DEALS.d4_health,
      actorId: USER_REP1_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEGOTIATION,
      newStage: DealStage.PROPOSAL,
      reason: 'Procurement committee requested revised payment terms and custom SLA discount.',
      createdAt: new Date('2026-08-28T15:30:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000027',
      dealId: DEALS.d4_health,
      actorId: USER_REP1_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.PROPOSAL,
      newStage: DealStage.NEGOTIATION,
      createdAt: new Date('2026-09-02T16:00:00.000Z'),
    },

    // Deal 5 (WON): Full progression to WON
    {
      id: '40000000-0000-4000-8000-000000000028',
      dealId: DEALS.d5_pos,
      actorId: USER_REP2_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-07-10T10:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000029',
      dealId: DEALS.d5_pos,
      actorId: USER_REP2_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.QUALIFIED,
      newStage: DealStage.PROPOSAL,
      createdAt: new Date('2026-07-22T11:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000030',
      dealId: DEALS.d5_pos,
      actorId: USER_REP2_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.PROPOSAL,
      newStage: DealStage.NEGOTIATION,
      createdAt: new Date('2026-08-05T14:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000031',
      dealId: DEALS.d5_pos,
      actorId: USER_REP2_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEGOTIATION,
      newStage: DealStage.WON,
      createdAt: new Date('2026-08-20T16:00:00.000Z'),
    },

    // Deal 6 (LOST): Full progression to LOST with reason
    {
      id: '40000000-0000-4000-8000-000000000032',
      dealId: DEALS.d6_gateway,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-06-25T10:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000033',
      dealId: DEALS.d6_gateway,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.QUALIFIED,
      newStage: DealStage.PROPOSAL,
      createdAt: new Date('2026-07-02T11:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000034',
      dealId: DEALS.d6_gateway,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.PROPOSAL,
      newStage: DealStage.NEGOTIATION,
      createdAt: new Date('2026-07-10T14:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000035',
      dealId: DEALS.d6_gateway,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEGOTIATION,
      newStage: DealStage.LOST,
      reason: 'Competitor offered 40% discount on 3-year upfront commitment.',
      createdAt: new Date('2026-07-15T11:30:00.000Z'),
    },

    // Deal 10: Owner Reassignment (Marcus Chen -> Priya Sharma) by Manager Sarah Jenkins
    {
      id: '40000000-0000-4000-8000-000000000036',
      dealId: DEALS.d10_ecommerce,
      actorId: USER_MANAGER_ID,
      type: HistoryType.OWNER_CHANGED,
      oldOwnerId: USER_REP3_ID,
      newOwnerId: USER_REP2_ID,
      note: 'Reassigned territory account to Priya to streamline retail partner relations.',
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000037',
      dealId: DEALS.d10_ecommerce,
      actorId: USER_REP2_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-08-10T14:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000038',
      dealId: DEALS.d10_ecommerce,
      actorId: USER_REP2_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.QUALIFIED,
      newStage: DealStage.PROPOSAL,
      createdAt: new Date('2026-08-20T15:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000039',
      dealId: DEALS.d10_ecommerce,
      actorId: USER_REP2_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.PROPOSAL,
      newStage: DealStage.NEGOTIATION,
      createdAt: new Date('2026-09-01T16:00:00.000Z'),
    },

    // Deal 13: Closed as LOST, then REOPENED by Manager Sarah Jenkins
    {
      id: '40000000-0000-4000-8000-000000000040',
      dealId: DEALS.d13_reopened,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEW,
      newStage: DealStage.QUALIFIED,
      createdAt: new Date('2026-07-12T10:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000041',
      dealId: DEALS.d13_reopened,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.QUALIFIED,
      newStage: DealStage.PROPOSAL,
      createdAt: new Date('2026-07-20T11:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000042',
      dealId: DEALS.d13_reopened,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.PROPOSAL,
      newStage: DealStage.NEGOTIATION,
      createdAt: new Date('2026-07-28T14:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000043',
      dealId: DEALS.d13_reopened,
      actorId: USER_REP3_ID,
      type: HistoryType.STAGE_CHANGED,
      oldStage: DealStage.NEGOTIATION,
      newStage: DealStage.LOST,
      reason: 'Client paused project due to Q3 budget freeze.',
      createdAt: new Date('2026-08-10T16:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000044',
      dealId: DEALS.d13_reopened,
      actorId: USER_MANAGER_ID, // Manager reopens
      type: HistoryType.REOPENED,
      oldStage: DealStage.LOST,
      newStage: DealStage.NEGOTIATION,
      note: 'Client secured additional Q4 budget allocation and requested to resume negotiations.',
      createdAt: new Date('2026-08-25T11:00:00.000Z'),
    },

    // Deal 18 (SOFT-DELETED): Note added, then soft-deleted with immutable DELETED event
    {
      id: '40000000-0000-4000-8000-000000000045',
      dealId: DEALS.d18_softDeleted,
      actorId: USER_REP2_ID,
      type: HistoryType.NOTE_ADDED,
      note: 'Duplicate opportunity created by mistake during client onboarding.',
      createdAt: new Date('2026-09-05T14:00:00.000Z'),
    },
    {
      id: '40000000-0000-4000-8000-000000000046',
      dealId: DEALS.d18_softDeleted,
      actorId: USER_REP2_ID,
      type: HistoryType.DELETED,
      note: 'Deal moved to Trash.',
      createdAt: new Date('2026-09-08T10:15:00.000Z'),
    },
  ];

  for (const h of historyEvents) {
    await prisma.dealHistory.upsert({
      where: { id: h.id },
      update: h,
      create: h,
    });
  }

  // --------------------------------------------------------------------------
  // 7. Deal Alerts
  // Deal 14 is overdue with NO dismissal record (appears in alerts)
  // Deal 15 is overdue WITH dismissal record (dismissed for current close date)
  // --------------------------------------------------------------------------
  console.log('⏰ Seeding Deal Alerts...');
  await prisma.dealAlert.upsert({
    where: { dealId: DEALS.d15_overdueDism },
    update: {
      dismissedCloseDate: new Date('2026-09-05'),
      dismissedAt: new Date('2026-09-06T09:00:00.000Z'),
    },
    create: {
      dealId: DEALS.d15_overdueDism,
      dismissedCloseDate: new Date('2026-09-05'),
      dismissedAt: new Date('2026-09-06T09:00:00.000Z'),
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('===========================================================');
  console.log('Summary of Seeded Records:');
  console.log('  Organization: 1 (Busy Infotech)');
  console.log('  Team:         1 (Enterprise Sales Team)');
  console.log('  Users:        4 (1 Manager: manager@busy.com, 3 Sales Reps: alex, priya, marcus)');
  console.log('  Companies:    8 (7 Active, 1 Archived: Legacy Ironworks)');
  console.log('  Deals:        18 (17 Active across all 6 stages, 1 Soft-deleted in Trash)');
  console.log('  Collaborators:5 collaboration links (Deal 3 has multiple reps)');
  console.log('  History:      46 immutable timeline events (CREATED, STAGE_CHANGED, backward reason, OWNER_CHANGED, NOTE_ADDED, REOPENED, DELETED)');
  console.log('  Alerts:       1 Overdue active deal (Deal 14), 1 Overdue dismissed alert (Deal 15)');
  console.log('===========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error executing database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
