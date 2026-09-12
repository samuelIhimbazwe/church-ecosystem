/**
 * Smoke checks for the server policy engine (DB-backed).
 * Run: npm run test:policy  (from server/)
 */
import 'dotenv/config';
import { authorizePerson, grantsForPerson } from '../src/policy/index.js';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const pastorYouth = await authorizePerson({
    personId: 'p-pastor',
    systemId: 'sys-youth',
    resource: 'SYSTEM',
    action: 'ENTER',
  });
  assert(pastorYouth.allowed, 'Pastor should ENTER sys-youth via governance');

  const pastorFund = await authorizePerson({
    personId: 'p-pastor',
    systemId: 'sys-finance',
    resource: 'FINANCE',
    action: 'VIEW',
    fundId: 'fund-general',
  });
  assert(!pastorFund.allowed, 'Pastor must NOT open General Fund without grant');

  const treasFund = await authorizePerson({
    personId: 'p-church-treas',
    systemId: 'sys-finance',
    resource: 'FINANCE',
    action: 'MANAGE',
    fundId: 'fund-general',
  });
  assert(treasFund.allowed, 'Treasurer should MANAGE General Fund');

  const treasMusicFund = await authorizePerson({
    personId: 'p-church-treas',
    systemId: 'sys-finance',
    resource: 'FINANCE',
    action: 'MANAGE',
    fundId: 'fund-music',
  });
  assert(treasMusicFund.allowed, 'Treasurer should MANAGE fund-music via kit grant');

  const treasProtocol = await authorizePerson({
    personId: 'p-church-treas',
    systemId: 'sys-protocol',
    resource: 'SYSTEM',
    action: 'ENTER',
  });
  assert(
    treasProtocol.allowed,
    'Treasurer should ENTER sys-protocol via seeded Assignment',
  );

  const treasGrants = await grantsForPerson('p-church-treas');
  assert(
    treasGrants.some((g) => g.resource === 'FINANCE' && g.fundId === 'fund-general'),
    'Treasurer grants should include fund-general',
  );
  assert(
    treasGrants.some(
      (g) =>
        g.systemId === 'sys-protocol' &&
        g.resource === 'SYSTEM' &&
        g.action === 'ENTER' &&
        g.source === 'ASSIGNMENT',
    ),
    'Treasurer grants should include ASSIGNMENT ENTER protocol',
  );

  console.log('policy smoke OK');
  console.log(`  pastor ENTER youth: ${pastorYouth.allowed}`);
  console.log(`  pastor VIEW fund-general: ${pastorFund.allowed}`);
  console.log(`  treasurer MANAGE fund-general: ${treasFund.allowed}`);
  console.log(`  treasurer MANAGE fund-music: ${treasMusicFund.allowed}`);
  console.log(`  treasurer ENTER protocol (assignment): ${treasProtocol.allowed}`);
  console.log(`  treasurer grant count: ${treasGrants.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
