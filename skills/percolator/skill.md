# Percolator Skill

name: percolator
description: On-chain perpetuals risk engine with immutable deployment and 5 SOL insurance vault challenge
version: 1.0.0
category: defi
triggers:
  - percolator
  - risk engine
  - immutable market
  - 5 sol challenge
  - hack percolator
  - extract funds
  - perpetual futures
  - slab architecture
  - liquidation
  - margin trading
  - funding rate
  - ewma
  - oracle manipulation
  - security audit
  - exploit

commands:
  # Risk Engine Commands
  - name: status
    description: Display Percolator risk engine status
    command: clawd percolator status

  - name: inspect
    description: Inspect a specific position
    params:
      - name: position
        type: string
        required: true
    command: clawd percolator inspect --position {position}

  - name: mark
    description: View EWMA mark price tracking
    params:
      - name: token
        type: string
        default: SOL
    command: clawd percolator mark --token {token}

  - name: insurance
    description: Check insurance fund status
    command: clawd percolator insurance

  - name: size
    description: Calculate risk-adjusted position size
    params:
      - name: signal
        type: float
        default: 0.7
      - name: confidence
        type: float
        default: 0.8
      - name: capital
        type: uint64
        default: 1000000000
    command: clawd percolator size --signal {signal} --confidence {confidence} --capital {capital}

  - name: vault
    description: Show ClawVault memory statistics
    command: clawd percolator vault

  # Deployment Commands
  - name: deploy-immutable
    description: Deploy an immutable Percolator market with 5 SOL insurance
    command: |
      # Run from percolator-cli-master directory:
      chmod +x scripts/deploy-immutable.sh
      ./scripts/deploy-immutable.sh
      
      # This will:
      # 1. Generate market keypair
      # 2. Create slab account (200KB)
      # 3. Create vault token account
      # 4. Initialize market
      # 5. BURN admin keys
      # 6. Fund insurance with 5 SOL
      # 7. Verify immutability

  - name: verify-immutable
    description: Verify market immutability
    params:
      - name: slab
        type: string
        required: true
    command: percolator verify-immutable --slab {slab}

  # Market Inspection Commands
  - name: slab-config
    description: View market configuration
    params:
      - name: slab
        type: string
        required: true
    command: percolator slab-config --slab {slab}

  - name: slab-engine
    description: View engine state
    params:
      - name: slab
        type: string
        required: true
    command: percolator slab-engine --slab {slab}

  - name: slab-params
    description: View risk parameters
    params:
      - name: slab
        type: string
        required: true
    command: percolator slab-params --slab {slab}

  - name: slab-account
    description: View specific account state
    params:
      - name: slab
        type: string
        required: true
      - name: idx
        type: integer
        required: true
    command: percolator slab-account --slab {slab} --idx {idx}

  - name: slab-accounts
    description: List all market accounts
    params:
      - name: slab
        type: string
        required: true
    command: percolator slab-accounts --slab {slab}

  - name: best-price
    description: Get best bid/ask prices
    params:
      - name: slab
        type: string
        required: true
    command: percolator best-price --slab {slab}

  # Keeper Commands
  - name: keeper-crank
    description: Run keeper crank (permissionless)
    params:
      - name: slab
        type: string
        required: true
      - name: oracle
        type: string
        required: true
    command: percolator keeper-crank --slab {slab} --oracle {oracle}

  - name: liquidate
    description: Liquidate a position at oracle price
    params:
      - name: slab
        type: string
        required: true
      - name: target
        type: integer
        required: true
      - name: oracle
        type: string
        required: true
    command: percolator liquidate-at-oracle --slab {slab} --target-idx {target} --oracle {oracle}

  # Security Commands
  - name: burn-admin
    description: Burn admin keys to make market immutable
    params:
      - name: slab
        type: string
        required: true
    command: percolator burn-admin --slab {slab}

  - name: burn-oracle-auth
    description: Burn oracle authority
    params:
      - name: slab
        type: string
        required: true
    command: percolator burn-oracle-auth --slab {slab}

  # Challenge Commands
  - name: challenge
    description: Display 5 SOL challenge information
    command: |
      echo "🦂 THE 5 SOL CHALLENGE"
      echo "======================"
      echo ""
      echo "Objective: Extract 5 SOL from an immutable Percolator market"
      echo ""
      echo "Market Properties:"
      echo "  • Admin Key: BURNED (11111111111111111111111111111111)"
      echo "  • Oracle Authority: BURNED"
      echo "  • Insurance Fund: 5,000,000,000 lamports"
      echo "  • Crank: Permissionless"
      echo "  • Trading: Requires external matcher"
      echo ""
      echo "Attack Vectors:"
      echo "  1. Oracle Manipulation (Pyth price feeds)"
      echo "  2. Liquidation Circuit Exploits"
      echo "  3. Funding Rate Calculation Bugs"
      echo "  4. U128 Math Overflow/Underflow"
      echo "  5. Account Slot Attacks"
      echo "  6. Cross-Program Invocations"
      echo ""
      echo "See CLAUDE.md for full exploration guide."

  - name: analyze
    description: Analyze market for vulnerabilities
    params:
      - name: slab
        type: string
        required: false
    command: |
      # Run from percolator-cli-master directory:
      chmod +x scripts/challenge-analyze.sh
      ./scripts/challenge-analyze.sh {slab}

  - name: security-audit
    description: View security audit report
    command: |
      cat solana-clawd/PERCOLATOR_SECURITY_AUDIT.md

security_notes:
  - Markets are immutable once admin keys are burned
  - Insurance fund can only be extracted through liquidation profits
  - Keeper crank is permissionless - anyone can run it
  - Oracle prices come from external Pyth feeds
  - Trading requires a separate matcher program
  - Only way to extract insurance is via legitimate liquidation profits

examples:
  - description: Deploy immutable market
    command: |
      cd percolator-cli-master
      chmod +x scripts/deploy-immutable.sh
      ./scripts/deploy-immutable.sh

  - description: Check risk status
    command: clawd percolator status

  - description: Analyze deployed market
    command: |
      cd percolator-cli-master
      ./scripts/challenge-analyze.sh <SLAB_PUBKEY>

  - description: Get challenge info
    command: clawd percolator challenge

  - description: View market engine state
    command: percolator slab-engine --slab <SLAB>

  - description: List market accounts
    command: percolator slab-accounts --slab <SLAB>

  - description: Run keeper crank
    command: percolator keeper-crank --slab <SLAB> --oracle <ORACLE>
