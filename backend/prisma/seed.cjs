require('dotenv/config')

const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/2oo3?schema=public'

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const demoEmail = 'lead.commissioning@example.com'

  await prisma.user.deleteMany({
    where: {
      email: demoEmail,
    },
  })

  const user = await prisma.user.create({
    data: {
      displayName: 'Nadia Hassan',
      email: demoEmail,
      passwordHash: null,
      role: 'LEAD_ENGINEER',
      providerCredentials: {
        create: [
          {
            encryptedKeyMaterial: 'dev-placeholder-encrypted-openai-key',
            keyFingerprint: 'dev-openai-fingerprint',
            provider: 'OPENAI',
          },
          {
            encryptedKeyMaterial: 'dev-placeholder-encrypted-anthropic-key',
            keyFingerprint: 'dev-anthropic-fingerprint',
            provider: 'ANTHROPIC',
          },
          {
            encryptedKeyMaterial: 'dev-placeholder-encrypted-google-key',
            keyFingerprint: 'dev-google-fingerprint',
            provider: 'GOOGLE',
          },
        ],
      },
    },
  })

  const conversation = await prisma.conversation.create({
    data: {
      contextSummary:
        'Combined-cycle commissioning review for GT first fire readiness, HRSG steam blow constraints, loop checks, protection relay settings, punch list closure, and turnover package risk.',
      compressionState: {
        preservedIdentifiers: ['GT-1', 'HRSG-1', 'BOP-MCC-04', 'Relay-87G'],
        status: 'not_started',
      },
      title: 'GT-1 first fire and HRSG steam blow readiness review',
      userId: user.id,
    },
  })

  const userMessage = await prisma.message.create({
    data: {
      content:
        'Assess whether GT-1 can proceed to first fire while HRSG-1 steam blow punch list items, BOP loop checks, and generator protection relay testing remain open. Identify gating risks and next investigations for turnover readiness.',
      contextFingerprint: 'demo-shared-context-gt1-hrsg1-v1',
      conversationId: conversation.id,
      metadata: {
        disciplineTags: ['mechanical', 'I&C', 'electrical', 'turnover'],
        sharedContext: true,
      },
      role: 'USER',
      userId: user.id,
    },
  })

  await prisma.providerResponse.createMany({
    data: [
      {
        completedAt: new Date(),
        content:
          'OpenAI recommends holding first fire until permissive loop checks, lube oil trip validation, flame scanner checks, and Relay-87G protection tests are signed off. HRSG steam blow items can proceed in parallel only if temporary piping, silencers, and exclusion zones are accepted by turnover.',
        conversationId: conversation.id,
        latencyMs: 1280,
        messageId: userMessage.id,
        metadata: {
          model: 'gpt-demo',
          riskLevel: 'high',
        },
        provider: 'OPENAI',
        startedAt: new Date(Date.now() - 1400),
        status: 'COMPLETED',
      },
      {
        completedAt: new Date(),
        content:
          'Anthropic flags the same first-fire gates and adds that unresolved DCS alarm rationalization and vibration probe loop checks can mask startup instability. It recommends a punch list review by system boundary before energization and fuel admission.',
        conversationId: conversation.id,
        latencyMs: 1510,
        messageId: userMessage.id,
        metadata: {
          model: 'claude-demo',
          riskLevel: 'high',
        },
        provider: 'ANTHROPIC',
        startedAt: new Date(Date.now() - 1650),
        status: 'COMPLETED',
      },
      {
        completedAt: new Date(),
        content:
          'Google agrees first fire should wait for critical protection relay, fuel gas skid, purge permissive, and E-stop validation. It uniquely recommends confirming HRSG drum level transmitter calibration before steam blow to protect downstream temporary systems.',
        conversationId: conversation.id,
        latencyMs: 1175,
        messageId: userMessage.id,
        metadata: {
          model: 'gemini-demo',
          riskLevel: 'medium_high',
        },
        provider: 'GOOGLE',
        startedAt: new Date(Date.now() - 1300),
        status: 'COMPLETED',
      },
    ],
  })

  await prisma.comparisonResult.create({
    data: {
      agreements: [
        'All providers agree GT-1 first fire should not proceed until critical permissives, E-stop, flame detection, and protection relay tests are complete.',
        'All providers treat open punch list items by system boundary as a turnover readiness gate, not an administrative cleanup item.',
      ],
      conversationId: conversation.id,
      disagreements: [
        'Google is less restrictive on HRSG steam blow parallel work if temporary steam path checks are complete; OpenAI and Anthropic frame it as dependent on turnover acceptance.',
      ],
      messageId: userMessage.id,
      nextInvestigations: [
        'Confirm Relay-87G, generator differential, reverse power, and lockout relay trip paths are witnessed and signed.',
        'Reconcile BOP loop check exceptions for purge permissives, fuel gas skid valves, flame scanners, vibration probes, and HRSG drum level transmitters.',
        'Run a boundary-by-boundary punch list review for GT, HRSG, DCS, electrical, and turnover packages before fuel admission.',
      ],
      risks: [
        'Incomplete protection relay testing can allow unsafe synchronization or missed trip behavior during first fire escalation.',
        'Unresolved loop checks can hide permissive failures and create startup delay or equipment damage during purge and ignition.',
        'Steam blow temporary piping or exclusion zone gaps can create personnel safety exposure during parallel commissioning.',
      ],
      status: 'COMPLETED',
      uniqueInsights: [
        'Anthropic uniquely highlights DCS alarm rationalization and vibration probe loops as hidden first-fire risk multipliers.',
        'Google uniquely calls out HRSG drum level transmitter calibration before steam blow.',
      ],
    },
  })

  await prisma.attachment.create({
    data: {
      conversationId: conversation.id,
      distilledContext:
        'Attachment notes open Category A punch items for HRSG-1 steam blow temporary piping, GT-1 first fire permissive loops, generator protection relay witness sheets, and turnover package signatures.',
      extractedText:
        'Punch list extract: HRSG-1 temporary steam blow supports pending QC signoff; GT-1 purge permissive loop checks 94% complete; Relay-87G trip test awaiting witness; turnover package TOP-GT1-FF missing electrical acceptance signature.',
      extractionStatus: 'COMPLETED',
      filename: 'GT1-HRSG1-turnover-punch-list.csv',
      messageId: userMessage.id,
      metadata: {
        source: 'seed',
        systems: ['GT-1', 'HRSG-1', 'Electrical Protection', 'DCS'],
      },
      mimeType: 'text/csv',
      sizeBytes: 42816,
      storageUri: 'dev://attachments/GT1-HRSG1-turnover-punch-list.csv',
      userId: user.id,
    },
  })

  console.log(`Seeded demo user ${demoEmail}`)
  console.log(`Seeded conversation ${conversation.title}`)
}

main()
  .catch((error) => {
    console.error('Seed failed')
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
