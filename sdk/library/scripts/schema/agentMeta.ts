import { z } from 'zod';

import { knowledgeBaseItemSchema, lLMChatsSchema, lLMParamsSchema } from './llm';

export const metaDataSchema = z.object({
  /**
   * Avatar image URL or path
   */
  avatar: z.string(),
  /**
   * Background color for the agent
   */
  backgroundColor: z.string().optional(),
  /**
   * Category classification
   */
  category: z.string().optional(),
  /**
   * Optional risk posture for execution-focused agents
   */
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  /**
   * Optional strategy or fleet variant label
   */
  variant: z.string().optional(),
  /**
   * Description of the agent
   */
  description: z.string(),
  /**
   * Tags for categorization and search
   */
  tags: z.array(z.string()),
  /**
   * Display title of the agent
   */
  title: z.string(),
});

const providerSchema = z.object({
  /**
   * Provider fully-qualified name or slug
   */
  fqn: z.string(),
  /**
   * Human-readable provider label
   */
  label: z.string().optional(),
  /**
   * Why this provider exists in the agent's stack
   */
  purpose: z.string().optional(),
  /**
   * Provider pricing mode
   */
  pricingModel: z.enum(['free', 'fixed', 'metered', 'quote']).optional(),
  /**
   * Typical cost in USD for one useful call
   */
  typicalCostUsd: z.number().nonnegative().optional(),
  /**
   * Extra routing notes or caveats
   */
  notes: z.string().optional(),
});

const orchestrationStepSchema = z.object({
  /**
   * Name of the step in the loop
   */
  name: z.string(),
  /**
   * Role assigned to that step
   */
  role: z.string().optional(),
  /**
   * Goal of the step
   */
  objective: z.string(),
  /**
   * Optional list of expected outputs
   */
  outputs: z.array(z.string()).optional(),
});

const orchestrationSchema = z.object({
  /**
   * Named loop or workflow identifier
   */
  loop: z.string().optional(),
  /**
   * Ordered execution steps
   */
  steps: z.array(orchestrationStepSchema).optional(),
  /**
   * Required inputs for the orchestration
   */
  inputs: z.array(z.string()).optional(),
  /**
   * Expected outputs from the orchestration
   */
  outputs: z.array(z.string()).optional(),
  /**
   * Guardrails applied to the workflow
   */
  guardrails: z.array(z.string()).optional(),
});

const paymentSchema = z.object({
  /**
   * Whether the agent is payment-aware
   */
  enabled: z.boolean().optional(),
  /**
   * Settlement network
   */
  network: z.enum(['solana-mainnet', 'solana-devnet', 'localnet']).optional(),
  /**
   * Supported payment protocols
   */
  protocols: z.array(z.enum(['x402', 'mpp'])).optional(),
  /**
   * Stablecoins or rails accepted by the agent
   */
  acceptedCurrencies: z.array(z.string()).optional(),
  /**
   * How approvals are obtained
   */
  approvalMode: z.enum(['biometric', 'manual', 'sandbox']).optional(),
  /**
   * Smallest meaningful spend for the agent
   */
  smallestUnitUsd: z.number().nonnegative().optional(),
  /**
   * Optional sandbox invocation command
   */
  sandboxCommand: z.string().optional(),
  /**
   * Optional production invocation command
   */
  productionCommand: z.string().optional(),
});

const lobeAgentConfigSchema = z.object({
  /**
   * Compression threshold value
   */
  compressThreshold: z.number().optional(),
  /**
   * Display mode for the agent interface
   */
  displayMode: z.union([z.literal('chat'), z.literal('docs')]).optional(),
  /**
   * Enable compression threshold
   */
  enableCompressThreshold: z.boolean().optional(),
  /**
   * Enable history count tracking
   */
  enableHistoryCount: z.boolean().optional(),
  /**
   * Enable maximum tokens limit
   */
  enableMaxTokens: z.boolean().optional(),
  /**
   * Few-shot examples for better AI responses
   */
  fewShots: lLMChatsSchema.optional(),
  /**
   * Number of historical messages to keep
   */
  historyCount: z.number().optional(),
  /**
   * Input template for message formatting
   */
  inputTemplate: z.string().optional(),

  /**
   * knowledge bases
   */
  knowledgeBases: z.array(knowledgeBaseItemSchema).optional(),

  /**
   * Language model used by the agent
   */
  model: z.string().optional(),

  /**
   * Opening greeting message
   */
  openingMessage: z.string().optional(),

  /**
   * Suggested opening questions
   */
  openingQuestions: z.array(z.string()).optional(),

  /**
   * Language model parameters
   */
  params: lLMParamsSchema.optional(),
  /**
   * Payment-aware agent configuration
   */
  payment: paymentSchema.optional(),

  /**
   * Enabled plugins for the agent
   */
  plugins: z.array(z.string()).optional(),
  /**
   * Preferred provider catalog for the agent
   */
  providers: z.array(providerSchema).optional(),
  /**
   * Multi-step orchestration metadata
   */
  orchestration: orchestrationSchema.optional(),

  /**
   * System role/persona definition
   */
  systemRole: z.string().min(1),
});

export type LobeAgentConfig = z.infer<typeof lobeAgentConfigSchema>;

export const speraxAgentSchema = z.object({
  /**
   * Author of the agent
   */
  author: z.string(),
  /**
   * Agent configuration settings
   */
  config: lobeAgentConfigSchema,
  /**
   * Creation timestamp
   */
  createdAt: z.string(),
  /**
   * Example conversations
   */
  examples: lLMChatsSchema.optional(),
  /**
   * Homepage or repository URL
   */
  homepage: z.string().url(),
  /**
   * Unique identifier for the agent
   */
  identifier: z.string().regex(/^solana-[a-z0-9-]+$/),

  /**
   * knowledge count
   */
  knowledgeCount: z.number(),

  /**
   * Metadata information
   */
  meta: metaDataSchema,

  /**
   * Plugins count
   */
  pluginCount: z.number(),

  /**
   * Schema version number
   */
  schemaVersion: z.literal(1),

  /**
   * Summary or brief description of the agent
   */
  summary: z.string().optional(),

  /**
   * Token usage statistics for the agent
   */
  tokenUsage: z.number(),
});

export type SperaxAgent = z.infer<typeof speraxAgentSchema>;
export type LobeAgent = SperaxAgent;
