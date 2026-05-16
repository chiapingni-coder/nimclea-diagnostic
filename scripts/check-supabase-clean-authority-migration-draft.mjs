import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  'supabase/migrations/20260516000100_create_nimclea_clean_authority_tables.sql',
);

const requiredTables = [
  'customers',
  'cases',
  'diagnostics',
  'case_plans',
  'event_reviews',
  'case_events',
  'receipts',
  'verifications',
  'payments',
  'trial_lifecycle',
  'audit_trail',
  'hash_ledger',
];

const failures = [];
const passes = [];

const addPass = (message) => passes.push(message);
const addFailure = (message) => failures.push(message);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasPattern = (text, pattern) => pattern.test(text);

const getTableBlock = (sql, table, tableNames = requiredTables) => {
  const tableName = escapeRegExp(table);
  const nextTablePattern = tableNames
    .filter((candidate) => candidate !== table)
    .map(escapeRegExp)
    .join('|');
  const tableBlockPattern = new RegExp(
    `create\\s+table\\s+public\\.${tableName}\\s*\\([\\s\\S]*?(?=\\ncreate\\s+table\\s+public\\.(${nextTablePattern})\\s*\\(|$)`,
    'i',
  );

  return sql.match(tableBlockPattern)?.[0] ?? '';
};

const hasPositivePaymentEligibilityWording = (sql) => {
  const positiveReceiptPatterns = [
    /\bpayment\b[\s\S]{0,80}\bcreates?\b[\s\S]{0,80}\breceipt\s+eligibility\b/i,
    /\bpayment\b[\s\S]{0,80}\bgrants?\b[\s\S]{0,80}\breceipt\s+eligibility\b/i,
    /\bpayment\b[\s\S]{0,80}\bestablishes?\b[\s\S]{0,80}\breceipt\s+eligibility\b/i,
  ];

  return positiveReceiptPatterns.some((pattern) => {
    const match = sql.match(pattern)?.[0] ?? '';
    return match && !/\bdoes\s+not\b/i.test(match);
  });
};

const hasPositivePaymentVerificationWording = (sql) => {
  const positiveVerificationPatterns = [
    /\bpayment\b[\s\S]{0,80}\bcreates?\b[\s\S]{0,80}\bverification\s+eligibility\b/i,
    /\bpayment\b[\s\S]{0,80}\bgrants?\b[\s\S]{0,80}\bverification\s+eligibility\b/i,
    /\bpayment\b[\s\S]{0,80}\bestablishes?\b[\s\S]{0,80}\bverification\s+eligibility\b/i,
  ];

  return positiveVerificationPatterns.some((pattern) => {
    const match = sql.match(pattern)?.[0] ?? '';
    return match && !/\bdoes\s+not\b/i.test(match);
  });
};

const hasPositiveTrialOverrideWording = (sql) => {
  const trialOverridePatterns = [
    /\btrial\s+lifecycle\b[\s\S]{0,80}\boverrides?\b[\s\S]{0,80}\b(receipt|verification|payment)\s+authority\b/i,
    /\btrial\s+lifecycle\b[\s\S]{0,80}\breplaces?\b[\s\S]{0,80}\b(receipt|verification|payment)\s+authority\b/i,
  ];

  return trialOverridePatterns.some((pattern) => {
    const match = sql.match(pattern)?.[0] ?? '';
    return match && !/\b(does\s+not|remains\s+separate)\b/i.test(match);
  });
};

if (!existsSync(migrationPath)) {
  addFailure(`Missing migration file: ${migrationPath}`);
} else {
  const sql = readFileSync(migrationPath, 'utf8');
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();

  if (/\bcreate\s+extension\s+if\s+not\s+exists\s+pgcrypto\s*;/i.test(normalizedSql)) {
    addPass('pgcrypto preflight is present.');
  } else {
    addFailure('Missing: create extension if not exists pgcrypto;');
  }

  const prohibitedPatterns = [
    ['grant all', /\bgrant\s+all\b/i],
    ['grant to anon', /\bgrant\b[\s\S]{0,160}\bto\s+anon\b/i],
    ['drop table', /\bdrop\s+table\b/i],
    ['truncate', /\btruncate\b/i],
    ['delete from', /\bdelete\s+from\b/i],
    ['insert into', /\binsert\s+into\b/i],
    ['update ... set', /\bupdate\b[\s\S]{0,120}\bset\b/i],
    ['old Render JSON import logic', /\b(import|migrate|seed|load)\b[\s\S]{0,80}\bold\s+render\s+json\b/i],
    ['old Render JSON source table or file logic', /\b(from|source|read|copy)\b[\s\S]{0,80}\bold[_\s-]+render[_\s-]+json\b/i],
  ];

  for (const [label, pattern] of prohibitedPatterns) {
    if (hasPattern(sql, pattern)) {
      addFailure(`Prohibited pattern detected: ${label}`);
    } else {
      addPass(`No prohibited pattern detected: ${label}.`);
    }
  }

  if (hasPositivePaymentEligibilityWording(sql)) {
    addFailure('Payment wording suggests payment creates receipt eligibility.');
  } else {
    addPass('Payment wording does not suggest payment creates receipt eligibility.');
  }

  if (hasPositivePaymentVerificationWording(sql)) {
    addFailure('Payment wording suggests payment creates verification eligibility.');
  } else {
    addPass('Payment wording does not suggest payment creates verification eligibility.');
  }

  if (hasPositiveTrialOverrideWording(sql)) {
    addFailure('Trial lifecycle wording suggests trial overrides receipt, verification, or payment authority.');
  } else {
    addPass('Trial lifecycle wording does not suggest overriding receipt, verification, or payment authority.');
  }

  for (const table of requiredTables) {
    const tableName = escapeRegExp(table);
    const tableBlock = getTableBlock(sql, table);

    if (!tableBlock) {
      addFailure(`Missing required table: ${table}`);
      continue;
    }

    addPass(`Required table present: ${table}.`);

    const checks = [
      [
        `create table public.${table}`,
        new RegExp(`\\bcreate\\s+table\\s+public\\.${tableName}\\s*\\(`, 'i'),
      ],
      [
        `grant select to authenticated for ${table}`,
        new RegExp(`\\bgrant\\s+select\\s+on\\s+table\\s+public\\.${tableName}\\s+to\\s+authenticated\\s*;`, 'i'),
      ],
      [
        `grant service_role writes for ${table}`,
        new RegExp(
          `\\bgrant\\s+select\\s*,\\s*insert\\s*,\\s*update\\s*,\\s*delete\\s+on\\s+table\\s+public\\.${tableName}\\s+to\\s+service_role\\s*;`,
          'i',
        ),
      ],
      [
        `enable RLS for ${table}`,
        new RegExp(`\\balter\\s+table\\s+public\\.${tableName}\\s+enable\\s+row\\s+level\\s+security\\s*;`, 'i'),
      ],
      [
        `create policy for ${table}`,
        new RegExp(`\\bcreate\\s+policy\\s+[\\w_]+\\s+on\\s+public\\.${tableName}\\b`, 'i'),
      ],
    ];

    for (const [label, pattern] of checks) {
      if (hasPattern(tableBlock, pattern)) {
        addPass(`${label}.`);
      } else {
        addFailure(`Missing table requirement: ${label}.`);
      }
    }
  }

  const eventReviewsBlock = getTableBlock(sql, 'event_reviews');
  const caseEventsBlock = getTableBlock(sql, 'case_events');

  const sourceOnlyGuardChecks = [
    [
      'event_reviews includes case_event_id uuid',
      eventReviewsBlock,
      /\bcase_event_id\s+uuid\b/i,
    ],
    [
      'event_reviews includes review_result text',
      eventReviewsBlock,
      /\breview_result\s+text\b/i,
    ],
    [
      'event_reviews includes case_schema jsonb',
      eventReviewsBlock,
      /\bcase_schema\s+jsonb\b/i,
    ],
    [
      'case_events includes case_event_id uuid primary key',
      caseEventsBlock,
      /\bcase_event_id\s+uuid\s+primary\s+key\b/i,
    ],
    [
      'case_events includes event_type text not null',
      caseEventsBlock,
      /\bevent_type\s+text\s+not\s+null\b/i,
    ],
    [
      'case_events includes raw_event jsonb',
      caseEventsBlock,
      /\braw_event\s+jsonb\b/i,
    ],
    [
      'deferred FK exists from event_reviews.case_event_id to case_events.case_event_id',
      normalizedSql,
      /alter\s+table\s+public\.event_reviews\s+add\s+constraint\s+event_reviews_case_event_id_fkey\s+foreign\s+key\s+\(case_event_id\)\s+references\s+public\.case_events\s*\(\s*case_event_id\s*\)\s*;/i,
    ],
  ];

  for (const [label, text, pattern] of sourceOnlyGuardChecks) {
    if (hasPattern(text, pattern)) {
      addPass(`${label}.`);
    } else {
      addFailure(`Missing source-only guard: ${label}.`);
    }
  }
}

console.log('Supabase clean authority migration draft guard');
console.log(`Checked: ${migrationPath}`);
console.log('');

if (failures.length > 0) {
  console.log('FAIL');
  console.log('');
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log('PASS');
  console.log('');
  console.log(`Validated ${requiredTables.length} required tables, case-event review authority link guards, pgcrypto preflight, grants, RLS, policies, and static safety rules.`);
}
