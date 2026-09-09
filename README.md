# Filecoin Oracle Service

A backend service that automates PoRep Market operations on Filecoin. It synchronizes
deals from smart contracts to PostgreSQL, fetches SLI data from CDP, publishes
on-chain attestations, calculates deal scores, refreshes evidence, handles
settlements, and exposes an API for reading state and manually triggering jobs.

## What the service does

Main responsibilities:

- synchronizes deals, SLI requirements, payments, allocations, and claims from the blockchain;
- can check DataCap posting completion and activate evidence when manually triggered;
- periodically refreshes evidence status;
- fetches average SLI metrics from CDP and stores them in the SLI Oracle contract;
- calculates scores based on current SLI values and deal requirements;
- detects sectors terminated before the expected end date;
- contains inactive helpers for finalizing deals and terminating payment rails;
- synchronizes settlement history and executes Filecoin Pay settlements;
- publishes SLI targets to URL Finder;
- stores transaction receipts and gas usage linked to deals;
- exposes an HTTP API for deals, scores, and gas usage statistics.

## Architecture and data flow

```mermaid
flowchart LR
    Cron[Cron scheduler] --> Scheduled[Scheduled jobs]
    Debug[Authenticated debug endpoint] --> Manual[Manually triggered jobs]
    ReadAPI[Deals and gas API] --> DB[(PostgreSQL)]

    Scheduled --> DB
    Manual --> DB
    Scheduled --> Chain[Filecoin RPC]
    Manual --> Chain
    Scheduled --> CDP[CDP Service]
    Scheduled --> URLFinder[URL Finder]
    Scheduled --> Lotus[Filecoin JSON-RPC / Lotus]

    Chain --> View[PoRep Market View Helper]
    Chain --> PoRep[PoRep Market]
    Chain --> Adapters[Per-deal DataCap Evidence Adapters]
    Chain --> Oracle[SLI Oracle]
    Chain --> Scorer[SLI Scorer]
    Chain --> Pay[Filecoin Pay]
    Chain --> Inspectors[Claim and Sector Inspectors]

    Scheduled -->|receipts, deal state, scores| DB
    Manual -->|receipts and evidence state| DB
```

Main deal processing flow:

```mermaid
flowchart TD
    SyncCron[Cron: sync-deals] --> Views[Read paginated deal views]
    Views --> Adapter[Read allocation status and, when needed, allocation/claim IDs]
    Adapter --> Inspector[Read matched claims]
    Inspector --> Upsert[Upsert deal graph in PostgreSQL]

    Debug[Debug API: datacap-posting-finished] --> Eligible[Select Accepted + Allocated deals]
    Eligible --> Finished{Posting finished?}
    Finished -->|yes| Batches[submitEvidenceBatch for every configured batch]
    Batches --> Accepted{All batches accepted?}
    Accepted -->|yes| Activate[activateEvidence]
    Activate --> Marker[Store receipts and set local activatePaymentAt]
    Finished -->|no| Stop[Retry on a later manual run]
    Accepted -->|no| Stop

    SliCron[Cron: set-sli] --> Active[Select active, matched, payment-activated deals]
    Active --> CDP[Fetch average SLI values from CDP]
    CDP --> SetSLI[Send one setSLI transaction per attestation]
    SetSLI --> Score[Read attestations and calculate scores]
    Score --> StoreScore[Store transaction receipts and score history]

    SettlementCron[Cron: run-settlement] --> SyncHistory[Sync eligible rail history from CDP]
    SyncHistory --> Due[Select rails due after 30 days]
    Due --> Settle[settleRail]
    Settle --> StoreSettlement[Store settlement and transaction receipt]
```

## Jobs

| Job / debug name              | Trigger          | Description                                                                                                                           |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `sync-deals`                  | cron + debug API | Reads paginated deal views, DataCap state, conditionally allocation/claim IDs and matched claims, then upserts each deal.             |
| `sync-url-finder-sli-targets` | cron + debug API | PUTs active, not-yet-synced deal manifests, parameters, and SLI requirements to URL Finder; failures are retried later.               |
| `datacap-posting-finished`    | debug API only   | For Accepted/Allocated deals, checks posting completion, submits evidence batches, activates evidence, and sets `activatePaymentAt`.  |
| `set-sli`                     | cron + debug API | For active, allocation-matched, payment-activated deals, fetches CDP averages, sends one `setSLI` transaction per deal, then scores.  |
| `track-terminated-claims`     | cron + debug API | Resolves sector deadline/partition data with retries, validates batches through Sector Status Inspector, and marks dead claims in DB. |
| `run-settlement`              | cron + debug API | First synchronizes eligible rail history from CDP, then settles rails due after 30 days and stores settlement/transaction records.    |
| `sync-settlement-history`     | debug API only   | Fetches `settledUpTo` for eligible rails from CDP and stores local settlement history.                                                |
| `refresh-evidence-status`     | cron + debug API | For active, matched, payment-activated deals, calls `refreshEvidenceStatus` in batches and stores each status and receipt.            |
| `track-terminated-deals`      | debug API only   | Selects active deals past `dealEndEpoch`; transaction and database mutation are commented out, so the job currently only logs.        |

`finalizeDealJob` and its `finalizeDeal` transaction wrapper exist in the
codebase, but the job is neither scheduled nor exposed by the debug API.

## Smart contract operations

### State-changing transactions

| Contract                 | Function                | Wallet role               | Purpose                                                                                                             |
| ------------------------ | ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| SLI Oracle               | `setSLI`                | `ORACLE_ROLE`             | Stores SLI metrics for an individual deal. A `multicall` variant is also available.                                 |
| PoRep Market             | `submitEvidenceBatch`   | `POREP_SERVICE_ROLE`      | Submits the next batch of evidence.                                                                                 |
| PoRep Market             | `activateEvidence`      | `POREP_SERVICE_ROLE`      | Activates evidence after all batches have been accepted.                                                            |
| PoRep Market             | `refreshEvidenceStatus` | `POREP_SERVICE_ROLE`      | Refreshes evidence coverage and status.                                                                             |
| PoRep Market             | `finalizeDeal`          | `POREP_SERVICE_ROLE`      | Wrapper used only by the inactive `finalizeDealJob`; the job has no current trigger.                                |
| PoRep Market             | `activatePayment`       | `POREP_SERVICE_ROLE`      | Activates payment; the wrapper exists, but the current evidence flow only sets the local `activatePaymentAt` value. |
| DataCap Evidence Adapter | `claimsTerminatedEarly` | `TERMINATION_ORACLE_ROLE` | Reports allocation IDs terminated early; the wrapper is not currently used by the claim tracking job.               |
| Filecoin Pay             | `settleRail`            | `FILECOIN_PAY_ROLE`       | Settles a payment rail up to the current block/epoch.                                                               |
| Validator                | `terminateRail`         | `POREP_SERVICE_ROLE`      | Wrapper exists, but its call is commented out in `trackTerminateDealJob`.                                           |

Each transaction is simulated before it is submitted. The service then waits for
the receipt and stores its `transactionHash`, block number, addresses, and
`gasUsed` in the database. The receipt is linked to its deal through
`onChainDealId`.

### Contract reads

| Contract                 | Function                                   | Purpose                                                       |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------- |
| PoRep Market View Helper | `getDealViews`                             | Reads all deal views using pages of 500.                      |
| PoRep Market             | `getDealSLIs`                              | Reads the required SLI thresholds.                            |
| DataCap Evidence Adapter | `getAllocationIdsPerDeal`, `getClaimIds`   | Reads IDs from each deal's adapter using pages of 500.        |
| DataCap Evidence Adapter | `getDealAllocationStatus`                  | Reads the DataCap allocation status.                          |
| DataCap Evidence Adapter | `isDataCapPostingFinished`                 | Checks whether evidence is ready for activation.              |
| Claim Inspector          | `getClaimForDeal`                          | Reads claims matched to a deal.                               |
| Sector Status Inspector  | `validateSectorStatus` through `multicall` | Validates sector statuses in batches.                         |
| SLI Oracle               | `getAttestation` through `multicall`       | Fetches the latest attestations for multiple deals.           |
| SLI Scorer               | `calculateScore`                           | Calculates a score as a read-only contract call.              |
| SP Registry              | `getProviders`                             | Reads storage providers; the wrapper is not used by jobs yet. |

## External integrations

- **CDP Service** — provides average deal SLI data and Filecoin Pay rail state.
- **URL Finder** — receives SLI targets and retrieval-related deal information.
- **Filecoin JSON-RPC / Lotus** — provides sector deadline and partition information.
- **PostgreSQL / Prisma** — stores deals, state history, requirements, payments,
  claims, scores, settlements, and on-chain transaction logs.

## HTTP API

After startup, OpenAPI documentation is available at `GET /docs`.

| Method | Endpoint                                   | Description                                                        |
| ------ | ------------------------------------------ | ------------------------------------------------------------------ |
| `GET`  | `/health`                                  | Health check.                                                      |
| `GET`  | `/deals`                                   | Paginated deals with an optional `state` filter.                   |
| `GET`  | `/deals/total-done`                        | Number of active deals with matched allocations.                   |
| `GET`  | `/deals/:onChainDealId`                    | Deal details.                                                      |
| `GET`  | `/deals/:onChainDealId/score`              | Deal score/history.                                                |
| `GET`  | `/on-chain-transactions/gas-usage`         | Gas usage by function, optionally filtered by deal.                |
| `GET`  | `/on-chain-transactions/gas-usage/history` | Daily gas usage filtered by `onChainDealId` and/or `functionName`. |
| `POST` | `/debug/trigger-job?job=<name>`            | Runs a job synchronously. Requires a Bearer token.                 |

Example manual job trigger:

```bash
curl -X POST \
  -H "Authorization: Bearer $JOB_TRIGGER_AUTH_TOKEN" \
  "[HOST]:[PORT]/debug/trigger-job?job=sync-deals"
```

## Local setup

Requirements:

- Node.js 24+;
- PostgreSQL 17 or a compatible version;
- access to a Filecoin RPC endpoint and deployed contract addresses.

```bash
cp .env.example .env
docker compose up -d oracle-service-db
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run dev
```

The application listens on port `3000` by default. PostgreSQL from
`docker-compose.yml` is exposed locally on port `8038`.

Example local database URL:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:8038/postgres
```

The repository contains Prisma migrations under `prisma/prisma/migrations`
(the path is resolved from `prisma/prisma.config.ts`). For a schema managed by
the repository, initialize or upgrade the database with:

```bash
npm run prisma:deploy
```

## Configuration

The complete list of keys is available in `.env.example`. The most important
groups are:

- connection: `RPC_URL`, `CHAIN_ID`, `DATABASE_URL`, and `APP_PORT`;
- integrations: `CDP_SERVICE_URL`, `URL_FINDER_SERVICE_URL`, and
  `URL_FINDER_AUTH_TOKEN`;
- contract addresses: `POREP_MARKET_CONTRACT_ADDRESS`,
  `POREP_MARKET_VIEW_CONTRACT_ADDRESS`, `SLI_ORACLE_CONTRACT_ADDRESS`,
  `SLI_SCORER_CONTRACT_ADDRESS`, `FILECOIN_PAY_CONTRACT_ADDRESS`,
  `CLAIM_INSPECTOR_CONTRACT_ADDRESS`, and
  `SECTOR_STATUS_INSPECTOR_CONTRACT_ADDRESS`;
- wallets: `POREP_SERVICE_ROLE_WALLET_PK`, `ORACLE_ROLE_WALLET_PK`,
  `TERMINATION_ORACLE_ROLE_WALLET_PK`, and `FILECOIN_PAY_ROLE_WALLET_PK`;
- jobs: `*_INTERVAL_CRON` variables, `EVIDENCE_BATCH_SIZE`, and
  `JOB_TRIGGER_AUTH_TOKEN`.

At startup the current implementation validates all `TRIGGER_*` cron variables,
including the intervals for terminate/end-epoch/reject-expired flows that are
not scheduled. `SYNC_URL_FINDER_SLI_TARGETS_JOB_INTERVAL_CRON` is scheduled but
is not part of that validation, so it must still be set to a valid cron value.

Private keys and tokens should be provided as secrets and must not be committed
to the repository.

## Useful commands

```bash
npm run dev                # run with ts-node
npm run build              # compile TypeScript
npm run start              # run the compiled dist/ output
npm run lint               # run ESLint with autofix
npm run format             # run Prettier
npm run prisma:generate    # generate the Prisma client
npm run prisma:deploy      # apply database migrations
```
