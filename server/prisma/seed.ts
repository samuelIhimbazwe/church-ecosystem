import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { MINISTRY_KIT_FUNDS, SPECIAL_MINISTRY_FUNDS, CHOIR_FUNDS, CHOIR_PARENT_ORG } from '../src/lib/ministryFunds.js';

const prisma = new PrismaClient();

const SYSTEMS = [
  {
    id: 'sys-main',
    code: 'MAIN_CHURCH',
    name: 'ADEPR Kacyiru — Main Church System',
    shortName: 'Main Church',
    kind: 'MAIN',
    basePath: '/',
    description: 'Identity and church-wide ops hub',
  },
  {
    id: 'sys-choir',
    code: 'CHOIR',
    name: 'Choir System',
    shortName: 'Choir',
    kind: 'MINISTRY',
    basePath: '/systems/choir',
    description: 'Seven named choirs under one peer system',
  },
  {
    id: 'sys-worship',
    code: 'WORSHIP',
    name: 'Worship System',
    shortName: 'Worship',
    kind: 'MINISTRY',
    basePath: '/systems/worship',
    description: 'Worship team music and finance',
  },
  {
    id: 'sys-youth',
    code: 'YOUTH',
    name: 'Youth System',
    shortName: 'Youth',
    kind: 'MINISTRY',
    basePath: '/systems/youth',
    description: 'Youth programs, events, finance kit',
  },
  {
    id: 'sys-deacon',
    code: 'DEACON',
    name: 'Deacon System',
    shortName: 'Deacon',
    kind: 'MINISTRY',
    basePath: '/systems/deacon',
    description: 'Care cases and benevolence',
  },
  {
    id: 'sys-protocol',
    code: 'PROTOCOL',
    name: 'Protocol System',
    shortName: 'Protocol',
    kind: 'MINISTRY',
    basePath: '/systems/protocol',
    description: 'Service staffing and schedule',
  },
  {
    id: 'sys-music',
    code: 'MUSIC',
    name: 'Music System',
    shortName: 'Music',
    kind: 'MINISTRY',
    basePath: '/systems/music',
    description: 'Music oversight peer kit',
  },
  {
    id: 'sys-media',
    code: 'MEDIA',
    name: 'Media System',
    shortName: 'Media',
    kind: 'MINISTRY',
    basePath: '/systems/media',
    description: 'Media peer kit',
  },
  {
    id: 'sys-men',
    code: 'MEN',
    name: 'Men System',
    shortName: 'Men',
    kind: 'MINISTRY',
    basePath: '/systems/men',
    description: 'Men fellowship peer kit',
  },
  {
    id: 'sys-women',
    code: 'WOMEN',
    name: 'Women System',
    shortName: 'Women',
    kind: 'MINISTRY',
    basePath: '/systems/women',
    description: 'Women fellowship peer kit',
  },
  {
    id: 'sys-couples',
    code: 'COUPLES',
    name: 'Couples System',
    shortName: 'Couples',
    kind: 'MINISTRY',
    basePath: '/systems/couples',
    description: 'Couples peer kit',
  },
  {
    id: 'sys-children',
    code: 'CHILDREN',
    name: 'Children System',
    shortName: 'Children',
    kind: 'MINISTRY',
    basePath: '/systems/children',
    description: 'Children / Sunday School peer kit',
  },
  {
    id: 'sys-elderly',
    code: 'ELDERLY',
    name: 'Elderly System',
    shortName: 'Elderly',
    kind: 'MINISTRY',
    basePath: '/systems/elderly',
    description: 'Elderly care peer kit',
  },
  {
    id: 'sys-evangelism',
    code: 'EVANGELISM',
    name: 'Evangelism System',
    shortName: 'Evangelism',
    kind: 'MINISTRY',
    basePath: '/systems/evangelism',
    description: 'Outreach peer kit',
  },
  {
    id: 'sys-intercessors',
    code: 'INTERCESSORS',
    name: 'Intercessors System',
    shortName: 'Intercessors',
    kind: 'MINISTRY',
    basePath: '/systems/intercessors',
    description: 'Prayer peer kit',
  },
  {
    id: 'sys-finance',
    code: 'FINANCE',
    name: 'Finance System',
    shortName: 'Finance',
    kind: 'SHARED',
    basePath: '/systems/finance',
    description: 'Shared ledger and org-private vaults',
  },
] as const;

async function main() {
  for (const s of SYSTEMS) {
    await prisma.churchSystem.upsert({
      where: { id: s.id },
      create: { ...s, status: 'ACTIVE' },
      update: {
        name: s.name,
        shortName: s.shortName,
        kind: s.kind,
        basePath: s.basePath,
        description: s.description,
      },
    });
  }

  const ouChurch = await prisma.orgUnit.upsert({
    where: { id: 'ou-church' },
    create: {
      id: 'ou-church',
      name: 'ADEPR Kacyiru',
      type: 'ORGANISATION',
    },
    update: { name: 'ADEPR Kacyiru' },
  });

  const ouFinance = await prisma.orgUnit.upsert({
    where: { id: 'ou-finance' },
    create: {
      id: 'ou-finance',
      name: 'Finance Office',
      type: 'OFFICE',
      parentId: ouChurch.id,
      systemId: 'sys-finance',
    },
    update: { name: 'Finance Office' },
  });

  await prisma.churchSystem.update({
    where: { id: 'sys-finance' },
    data: { orgUnitId: ouFinance.id },
  });

  const pastor = await prisma.person.upsert({
    where: { id: 'p-pastor' },
    create: {
      id: 'p-pastor',
      fullName: 'Pastor Bootstrap',
      preferredName: 'Pastor',
      status: 'ACTIVE',
    },
    update: {},
  });

  const treasurer = await prisma.person.upsert({
    where: { id: 'p-church-treas' },
    create: {
      id: 'p-church-treas',
      fullName: 'Church Treasurer Bootstrap',
      preferredName: 'Treasurer',
      status: 'ACTIVE',
    },
    update: {},
  });

  const hash = await bcrypt.hash('pastor123', 10);
  const treasHash = await bcrypt.hash('treas123', 10);

  await prisma.account.upsert({
    where: { username: 'pastor' },
    create: {
      id: 'acc-pastor',
      personId: pastor.id,
      username: 'pastor',
      passwordHash: hash,
    },
    update: { passwordHash: hash },
  });

  await prisma.account.upsert({
    where: { username: 'treasurer' },
    create: {
      id: 'acc-church-treas',
      personId: treasurer.id,
      username: 'treasurer',
      passwordHash: treasHash,
    },
    update: { passwordHash: treasHash },
  });

  await prisma.position.deleteMany({
    where: { personId: { in: [pastor.id, treasurer.id] } },
  });

  await prisma.position.create({
    data: {
      personId: pastor.id,
      systemId: 'sys-main',
      orgUnitId: ouChurch.id,
      title: 'Senior Pastor',
      systemRole: 'CHURCH_LEADER',
      grantsAllSystems: true,
      status: 'ACTIVE',
    },
  });

  await prisma.position.create({
    data: {
      personId: treasurer.id,
      systemId: 'sys-finance',
      orgUnitId: ouFinance.id,
      title: 'Church Treasurer',
      systemRole: 'CHURCH_TREASURER',
      status: 'ACTIVE',
    },
  });

  await prisma.membership.upsert({
    where: { id: 'mem-pastor-main' },
    create: {
      id: 'mem-pastor-main',
      personId: pastor.id,
      systemId: 'sys-main',
      orgUnitId: ouChurch.id,
      type: 'CHURCH_MEMBER',
      label: 'Church member',
      status: 'ACTIVE',
    },
    update: {},
  });

  await prisma.membership.upsert({
    where: { id: 'mem-treas-main' },
    create: {
      id: 'mem-treas-main',
      personId: treasurer.id,
      systemId: 'sys-main',
      orgUnitId: ouChurch.id,
      type: 'CHURCH_MEMBER',
      label: 'Church member',
      status: 'ACTIVE',
    },
    update: {},
  });

  await prisma.fund.upsert({
    where: { id: 'fund-general' },
    create: {
      id: 'fund-general',
      name: 'General Church Fund',
      code: 'GENERAL',
      kind: 'GENERAL',
      orgUnitId: ouFinance.id,
      ownerSystemId: 'sys-finance',
      description: 'Tithes, offerings, congregation treasury',
    },
    update: {},
  });

  await prisma.fundAccessGrant.deleteMany({
    where: { fundId: 'fund-general', personId: treasurer.id },
  });
  await prisma.fundAccessGrant.create({
    data: {
      fundId: 'fund-general',
      personId: treasurer.id,
      action: 'MANAGE',
      grantedByPersonId: pastor.id,
      reason: 'Church Treasurer — General Fund',
      status: 'ACTIVE',
    },
  });

  for (const kit of MINISTRY_KIT_FUNDS) {
    const ou = await prisma.orgUnit.upsert({
      where: { id: kit.orgId },
      create: {
        id: kit.orgId,
        name: kit.orgName,
        type: 'MINISTRY',
        parentId: ouChurch.id,
        systemId: kit.systemId,
      },
      update: { name: kit.orgName },
    });
    await prisma.churchSystem.update({
      where: { id: kit.systemId },
      data: { orgUnitId: ou.id },
    });
    await prisma.fund.upsert({
      where: { id: kit.fundId },
      create: {
        id: kit.fundId,
        name: kit.name,
        code: kit.code,
        kind: 'MINISTRY',
        orgUnitId: ou.id,
        ownerSystemId: kit.systemId,
        description: `${kit.orgName} org-private vault`,
      },
      update: { name: kit.name },
    });
    await prisma.fundAccessGrant.deleteMany({
      where: { fundId: kit.fundId, personId: treasurer.id },
    });
    await prisma.fundAccessGrant.create({
      data: {
        fundId: kit.fundId,
        personId: treasurer.id,
        action: 'MANAGE',
        grantedByPersonId: pastor.id,
        reason: `Demo — Church Treasurer verifies ${kit.code} claims`,
        status: 'ACTIVE',
      },
    });
  }

  for (const kit of SPECIAL_MINISTRY_FUNDS) {
    const ou = await prisma.orgUnit.upsert({
      where: { id: kit.orgId },
      create: {
        id: kit.orgId,
        name: kit.orgName,
        type: 'MINISTRY',
        parentId: ouChurch.id,
        systemId: kit.systemId,
      },
      update: { name: kit.orgName },
    });
    await prisma.churchSystem.update({
      where: { id: kit.systemId },
      data: { orgUnitId: ou.id },
    });
    await prisma.fund.upsert({
      where: { id: kit.fundId },
      create: {
        id: kit.fundId,
        name: kit.name,
        code: kit.code,
        kind: 'MINISTRY',
        orgUnitId: ou.id,
        ownerSystemId: kit.systemId,
        description: `${kit.orgName} org-private vault`,
      },
      update: { name: kit.name },
    });
    await prisma.fundAccessGrant.deleteMany({
      where: { fundId: kit.fundId, personId: treasurer.id },
    });
    await prisma.fundAccessGrant.create({
      data: {
        fundId: kit.fundId,
        personId: treasurer.id,
        action: 'MANAGE',
        grantedByPersonId: pastor.id,
        reason: `Demo — Church Treasurer verifies ${kit.code} claims`,
        status: 'ACTIVE',
      },
    });
  }

  const ouChoirParent = await prisma.orgUnit.upsert({
    where: { id: CHOIR_PARENT_ORG.id },
    create: {
      id: CHOIR_PARENT_ORG.id,
      name: CHOIR_PARENT_ORG.name,
      type: 'MINISTRY',
      parentId: ouChurch.id,
      systemId: CHOIR_PARENT_ORG.systemId,
    },
    update: { name: CHOIR_PARENT_ORG.name },
  });
  await prisma.churchSystem.update({
    where: { id: 'sys-choir' },
    data: { orgUnitId: ouChoirParent.id },
  });
  for (const choir of CHOIR_FUNDS) {
    const ou = await prisma.orgUnit.upsert({
      where: { id: choir.orgId },
      create: {
        id: choir.orgId,
        name: choir.name,
        type: 'TEAM',
        parentId: ouChoirParent.id,
        systemId: 'sys-choir',
      },
      update: { name: choir.name },
    });
    await prisma.fund.upsert({
      where: { id: choir.fundId },
      create: {
        id: choir.fundId,
        name: `${choir.name} Fund`,
        code: choir.code,
        kind: 'MINISTRY',
        orgUnitId: ou.id,
        ownerSystemId: 'sys-choir',
        description: `Private vault — ${choir.name} choir`,
      },
      update: { name: `${choir.name} Fund` },
    });
    await prisma.fundAccessGrant.deleteMany({
      where: { fundId: choir.fundId, personId: treasurer.id },
    });
    await prisma.fundAccessGrant.create({
      data: {
        fundId: choir.fundId,
        personId: treasurer.id,
        action: 'MANAGE',
        grantedByPersonId: pastor.id,
        reason: `Demo — Church Treasurer verifies ${choir.code} claims`,
        status: 'ACTIVE',
      },
    });
  }

  await prisma.assignment.upsert({
    where: { id: 'asgn-baptism-helper' },
    create: {
      id: 'asgn-baptism-helper',
      personId: treasurer.id,
      title: 'Baptism day helper',
      contextType: 'EVENT',
      contextId: 'evt-baptism-sep',
      contextLabel: 'Baptism Sunday',
      systemId: 'sys-protocol',
      status: 'ACTIVE',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-10-01'),
    },
    update: {
      status: 'ACTIVE',
      systemId: 'sys-protocol',
      endDate: new Date('2026-10-01'),
    },
  });

  await prisma.program.upsert({
    where: { id: 'prog-discipleship' },
    create: {
      id: 'prog-discipleship',
      name: 'Discipleship pathway',
      description: 'Standing church discipleship track',
      ownerSystemId: 'sys-main',
      visibility: 'GENERAL',
      status: 'ACTIVE',
      programType: 'DISCIPLESHIP',
      scheduleHint: 'Sundays after service',
      createdByPersonId: pastor.id,
    },
    update: { status: 'ACTIVE' },
  });

  await prisma.program.upsert({
    where: { id: 'prog-youth-cell' },
    create: {
      id: 'prog-youth-cell',
      name: 'Youth cell groups',
      description: 'Youth ministry small groups',
      ownerSystemId: 'sys-youth',
      visibility: 'MINISTRY',
      status: 'ACTIVE',
      programType: 'FELLOWSHIP',
      createdByPersonId: pastor.id,
    },
    update: { status: 'ACTIVE' },
  });

  await prisma.churchEvent.upsert({
    where: { id: 'evt-baptism-sep' },
    create: {
      id: 'evt-baptism-sep',
      name: 'Baptism Sunday',
      type: 'BAPTISM',
      description: 'Public baptisms',
      ownerSystemId: 'sys-main',
      visibility: 'GENERAL',
      startsAt: new Date('2026-09-28T10:00:00.000Z'),
      location: 'Main sanctuary',
      status: 'CONFIRMED',
      createdByPersonId: pastor.id,
      lifecyclePhase: 'PREPARE',
    },
    update: {},
  });

  await prisma.workTask.upsert({
    where: { id: 'task-welcome-pack' },
    create: {
      id: 'task-welcome-pack',
      title: 'Prepare welcome packs',
      description: 'For new visitors this month',
      ownerPersonId: treasurer.id,
      createdByPersonId: pastor.id,
      contextType: 'GENERAL',
      systemId: 'sys-main',
      grantsSystemAccess: false,
      visibility: 'GENERAL',
      status: 'TODO',
      startDate: new Date('2026-09-01'),
    },
    update: {},
  });

  await prisma.churchProject.upsert({
    where: { id: 'proj-sanctuary-sound' },
    create: {
      id: 'proj-sanctuary-sound',
      name: 'Sanctuary sound upgrade',
      description: 'Replace mixer and stage monitors',
      ownerSystemId: 'sys-main',
      visibility: 'GENERAL',
      status: 'ACTIVE',
      willSpend: true,
      createdByPersonId: pastor.id,
    },
    update: {},
  });

  console.log('Seed OK');
  console.log('  pastor / pastor123  (CHURCH_LEADER)');
  console.log('  treasurer / treas123  (CHURCH_TREASURER + General + all kit funds MANAGE)');
  console.log('  mission: 2 programs, 1 event, 1 task, 1 project');
  console.log(`  finance: fund-general + ${MINISTRY_KIT_FUNDS.length} kit + ${SPECIAL_MINISTRY_FUNDS.length} special + ${CHOIR_FUNDS.length} choir vaults`);
  console.log('  assignment: asgn-baptism-helper → treasurer ENTER sys-protocol');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
