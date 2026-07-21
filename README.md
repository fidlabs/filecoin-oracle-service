# Filecoin Oracle Service

A backend service that automates PoRep Market operations on Filecoin. It synchronizes
deals from smart contracts to PostgreSQL, fetches SLI data from CDP, publishes
on-chain attestations, calculates deal scores, handles evidence and settlements,
and exposes an API for reading state and manually triggering jobs.

## What the service does

Main responsibilities:

- synchronizes deals, SLI requirements, payments, allocations, and claims from the blockchain;
- monitors DataCap posting completion and activates evidence;
- periodically refreshes evidence status;
- fetches average SLI metrics from CDP and stores them in the SLI Oracle contract;
- calculates scores based on current SLI values and deal requirements;
- detects sectors terminated before the expected end date;
- finalizes completed deals and rejects expired proposals;
- synchronizes settlement history and executes Filecoin Pay settlements;
- publishes SLI targets to URL Finder;
- stores transaction receipts and gas usage linked to deals;
- exposes an HTTP API for deals, scores, and gas usage statistics.

## Architecture and data flow

```mermaid
flowchart LR
    Scheduler[Cron scheduler or manual trigger] --> Jobs[Jobs]
    API[Fastify HTTP API] --> Jobs
    API --> DB[(PostgreSQL)]

    Jobs --> DB
    Jobs --> RPC[Filecoin RPC]
    Jobs --> CDP[CDP Service]
    Jobs --> URLFinder[URL Finder]
    Jobs --> FilecoinAPI[Filecoin JSON-RPC API]

    RPC --> PoRep[PoRep Market]
    RPC --> Evidence[DataCap Evidence Adapter]
    RPC --> Oracle[SLI Oracle]
    RPC --> Scorer[SLI Scorer]
    RPC --> Pay[Filecoin Pay]
    RPC --> Inspectors[Claim / Sector Inspectors]
    RPC --> Validator[Validator]

    PoRep --> Jobs
    Evidence --> Jobs
    Oracle --> Jobs
    Scorer --> Jobs
    Pay --> Jobs
    Inspectors --> Jobs
    Jobs -->|transactions and receipts| DB
```

Main deal processing flow:

```mermaid
sequenceDiagram
    participant Trigger as Cron / Debug API
    participant Service as Oracle Service
    participant Market as PoRep Market
    participant Evidence as Evidence Adapter
    participant CDP as CDP Service
    participant Oracle as SLI Oracle
    participant Scorer as SLI Scorer
    participant Pay as Filecoin Pay
    participant DB as PostgreSQL

    Trigger->>Service: run job
    Service->>Market: getDealViews()
    Service->>Evidence: status, allocation IDs, claim IDs
    Service->>DB: upsert deals, allocations, and claims

    Service->>Evidence: isDataCapPostingFinished()
    alt posting completed
        Service->>Market: submitEvidenceBatch()
        Service->>Market: activateEvidence()
        Service->>DB: store receipts and activatePaymentAt
    end

    Service->>CDP: average SLI data for active deals
    loop each deal
        Service->>Oracle: setSLI(dealId, SLI)
        Service->>DB: store receipt and gas usage
    end
    Service->>Oracle: getAttestation() through read-only multicall
    Service->>Scorer: calculateScore()
    Service->>DB: store score

    opt settlement required
        Service->>Pay: settleRail(railId, epoch)
        Service->>DB: store settlement and receipt
    end
```

## Jobs

| Job / trigger                 | Description                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `sync-deals`                  | Fetches deals from PoRep Market, DataCap status, allocation/claim IDs, and claim data, then synchronizes them with the database.       |
| `sync-url-finder-sli-targets` | Sends the deal manifest, deal parameters, and SLI requirements to URL Finder.                                                          |
| `datacap-posting-finished`    | Checks whether DataCap posting is complete, submits evidence in batches, and activates evidence.                                       |
| `set-sli`                     | Fetches average SLI data from CDP, executes a separate `setSLI` transaction for each deal, stores transactions, and calculates scores. |
| `track-terminated-claims`     | Fetches sector deadline/partition data, validates it through Sector Status Inspector, and marks dead sectors in the database.          |
| `run-settlement`              | Synchronizes settlement history, selects rails that require settlement, and executes `settleRail`.                                     |
| `sync-settlement-history`     | Fetches `settledUpTo` values for rails from CDP and updates local settlement history.                                                  |
| `refresh-evidence-status`     | Calls `refreshEvidenceStatus` in batches and stores the resulting evidence status and receipt.                                         |
| `track-terminated-deals`      | Selects deals past `dealEndEpoch`; the actual termination transaction and state update are currently commented out.                    |
| `reject-expired-deal`         | Finds deals in the `Proposed` state and calls `rejectExpiredDeal`.                                                                     |

The codebase also contains `finalizeDealJob`, which finalizes active deals after
their `serviceEndEpoch`, but it is not currently exposed through the debug API.

## Smart contract operations

### State-changing transactions

| Contract                 | Function                | Wallet role               | Purpose                                                                                                             |
| ------------------------ | ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| SLI Oracle               | `setSLI`                | `ORACLE_ROLE`             | Stores SLI metrics for an individual deal. A `multicall` variant is also available.                                 |
| PoRep Market             | `submitEvidenceBatch`   | `POREP_SERVICE_ROLE`      | Submits the next batch of evidence.                                                                                 |
| PoRep Market             | `activateEvidence`      | `POREP_SERVICE_ROLE`      | Activates evidence after all batches have been accepted.                                                            |
| PoRep Market             | `refreshEvidenceStatus` | `POREP_SERVICE_ROLE`      | Refreshes evidence coverage and status.                                                                             |
| PoRep Market             | `finalizeDeal`          | `POREP_SERVICE_ROLE`      | Finalizes a deal after its service period ends.                                                                     |
| PoRep Market             | `activatePayment`       | `POREP_SERVICE_ROLE`      | Activates payment; the wrapper exists, but the current evidence flow only sets the local `activatePaymentAt` value. |
| PoRep Market             | `rejectExpiredDeal`     | `ORACLE_ROLE`             | Rejects an expired deal proposal.                                                                                   |
| DataCap Evidence Adapter | `claimsTerminatedEarly` | `TERMINATION_ORACLE_ROLE` | Reports allocation IDs terminated early; the wrapper is not currently used by the claim tracking job.               |
| Filecoin Pay             | `settleRail`            | `FILECOIN_PAY_ROLE`       | Settles a payment rail up to the current block/epoch.                                                               |
| Validator                | `terminateRail`         | `POREP_SERVICE_ROLE`      | Terminates a rail;                                                                                                  |

Each transaction is simulated before it is submitted. The service then waits for
the receipt and stores its `transactionHash`, block number, addresses, and
`gasUsed` in the database. The receipt is linked to its deal through
`onChainDealId`.

### Contract reads

| Contract                 | Function                                   | Purpose                                                       |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------- |
| PoRep Market             | `getDealViews`                             | Reads all deals using pagination.                             |
| PoRep Market             | `getDealSLIs`                              | Reads the required SLI thresholds.                            |
| DataCap Evidence Adapter | `getAllocationIdsPerDeal`, `getClaimIds`   | Reads deal allocation and claim IDs using pagination.         |
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
- **Filecoin JSON-RPC** — provides sector deadline and partition information.
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
npx prisma db push --schema prisma/schema.prisma --config prisma/prisma.config.ts
npm run dev
```

The application listens on port `3000` by default. PostgreSQL from
`docker-compose.yml` is exposed locally on port `8038`.

Example local database URL:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:8038/postgres
```

The repository does not currently contain a `prisma/migrations` directory, so
the local database is initialized with `prisma db push`. Before a production
deployment, migrations should be created and committed, then applied with
`npm run prisma:deploy`.

## Configuration

The complete list of keys is available in `.env.example`. The most important
groups are:

- connection: `RPC_URL`, `CHAIN_ID`, `DATABASE_URL`, and `APP_PORT`;
- integrations: `CDP_SERVICE_URL`, `URL_FINDER_SERVICE_URL`, and
  `URL_FINDER_AUTH_TOKEN`;
- contract addresses: `POREP_MARKET_CONTRACT_ADDRESS`,
  `DATACAP_EVIDENCE_ADAPTER_CONTRACT_ADDRESS`, `SLI_ORACLE_CONTRACT_ADDRESS`,
  `SLI_SCORER_CONTRACT_ADDRESS`, `FILECOIN_PAY_CONTRACT_ADDRESS`,
  `CLAIM_INSPECTOR_CONTRACT_ADDRESS`, and
  `SECTOR_STATUS_INSPECTOR_CONTRACT_ADDRESS`;
- wallets: `POREP_SERVICE_ROLE_WALLET_PK`, `ORACLE_ROLE_WALLET_PK`,
  `TERMINATION_ORACLE_ROLE_WALLET_PK`, and `FILECOIN_PAY_ROLE_WALLET_PK`;
- jobs: `*_INTERVAL_CRON` variables, `EVIDENCE_BATCH_SIZE`, and
  `JOB_TRIGGER_AUTH_TOKEN`.

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
