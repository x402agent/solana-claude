import type { ClawTool } from '../agent/loop.js';
import { OreMiningAgent, type OreMiningPolicy } from './agent.js';

export function createOreClawTools(rpcUrl: string, policy?: Partial<OreMiningPolicy>): ClawTool[] {
  const agent = new OreMiningAgent({ rpcUrl, policy });
  return [
    {
      name: 'ore_status',
      description: 'Read ORE board, miner, and treasury state for the current OpenClawd wallet.',
      call: async () => agent.status(),
    },
    {
      name: 'ore_mine_once',
      description: 'Run one ORE mining decision. Defaults to dry-run unless the policy was created with execute=true.',
      call: async () => agent.mineOnce(),
    },
    {
      name: 'ore_configure_automation',
      description: 'Configure the ORE on-chain automation account under the active OpenClawd wallet policy.',
      call: async (args: unknown) => {
        const input = typeof args === 'object' && args ? args as {
          amountSol?: number;
          depositSol?: number;
          mask?: number;
          reload?: boolean;
        } : {};
        return agent.configureAutomation(input);
      },
    },
  ];
}
