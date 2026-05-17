# The First Agent Staking Platform on Solana

Most NFT staking contracts were built for static collectibles. OpenClawd Agent
Staking is built for something different: onchain agents that can own identity,
tools, services, reputation, payment rails, and eventually cash flow.

The first version is deliberately simple. A Metaplex Core agent asset stays in
the owner's wallet, but the staking program adds a frozen `FreezeDelegate`
plugin. That makes the asset non-transferable while it is staked. When the owner
unstakes, the program unfreezes the asset and removes the plugin.

That is the primitive: an agent can be locked without custody.

## Why Agent Staking Matters

Solana agents are becoming more than chatbots with wallets. In the OpenClawd
stack, an agent can be represented as a Metaplex Core asset, registered in the
Metaplex Agent Registry, connected to services, gated by wallet ownership, and
called through x402 or other payment flows.

Once the agent itself is an asset, staking becomes a coordination layer.

Owners can prove that an agent is committed to a protocol without transferring
it into an escrow vault. Apps can read the Core asset and see whether the
`FreezeDelegate` is present and frozen. Indexers can count active staked agents.
Future reward systems can build on top of that state without changing the basic
ownership model.

This is why the first release is not a rewards farm. It is the lock layer.

## The Design

OpenClawd Agent Staking uses one global pool PDA:

```text
seed: ["global-authority"]
```

The pool stores:

```text
admin
total_agents_staked
reserved
```

The deployed devnet program is:

```text
Program ID:      D5MLxrKAnppBVLuukKQzQGTMSfEwBqWCDPGAhGhthdLP
Global pool PDA: EyDhP1HU3yqCmqCpKkQHFuX3wMD6sJF1kK8eeRwmTr1K
MPL Core:        CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d
```

The program exposes three instructions.

`initialize` creates the global pool and sets the admin.

`stakeAgent` checks that the signer owns the Core asset, verifies that the asset
belongs to the configured Core collection, then adds:

```text
FreezeDelegate { frozen: true }
```

`unstakeAgent` checks that the caller is either the asset owner or the global
admin. It then updates the delegate to `frozen: false` and removes the
`FreezeDelegate` plugin entirely.

The important part is what the program does not do. It does not transfer the
asset. It does not wrap it. It does not rely on a marketplace-style escrow
account. The asset remains visible, owned, and inspectable as a Metaplex Core
agent.

## The User Surface

The OpenClawd frontend exposes the staking workflow at:

```text
/agents/stake
```

The page builds wallet-signed Solana transactions directly from the browser for
the Anchor instructions. It also reads the global pool PDA and inspects the Core
asset so a user can see:

- asset owner
- collection authority
- whether a `FreezeDelegate` exists
- whether the asset is currently frozen
- total staked agent count
- current pool admin

For a normal user, the flow is straightforward:

1. Connect wallet.
2. Paste the Metaplex Core agent asset.
3. Paste or load the agent collection.
4. Inspect the asset.
5. Stake.
6. Unstake when ready.

For operations, the admin path supports emergency unstaking. The admin can
unstake by providing the real asset owner as an override, but the program still
checks the decoded Core asset owner and collection before touching the delegate.

## Why Metaplex Core

Metaplex Core is a good fit for agents because plugins let the asset carry
behavioral state without creating a pile of extra token accounts. The
`FreezeDelegate` plugin is exactly the kind of low-level primitive an agent
economy needs: it is readable, enforceable, and attached to the asset itself.

For OpenClawd, this means staking can compose with:

- Core asset minting
- Agent Registry identity
- wallet-gated agent actions
- x402 paid API calls
- service manifests
- future reward indexers
- reputation and policy systems

The agent remains the center of the system.

## What Comes Next

The first release intentionally avoids reward math. That keeps the trust surface
small while the lock/unlock path is tested on devnet with real Core assets.

The next layers can be added without changing the basic principle:

- per-agent staking records
- lock durations
- reward vaults
- CLAWD emissions
- fee-share accounting
- dashboard indexing
- admin multisig controls
- mainnet deployment after devnet rehearsal

The foundation is live: Solana agents can now be staked as agents, not as
generic NFTs pretending to be agents.

That is the point. Agent ownership, agent identity, and agent commitment now fit
inside the same onchain object.
