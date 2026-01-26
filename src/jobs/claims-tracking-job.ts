import { getProvidersFromSlaAllocatorContract } from "../blockchain/sla-allocator-contract.js";
import {
  getClientAllocationIdsPerProvider,
  getClientsForSPFromClientContract,
  setClaimTerminatedEarly,
} from "../blockchain/sla-client-contract.js";
import {
  fetchClaims,
  fetchSectorInfo,
} from "../services/filecoin-api-service.js";
import { baseLogger } from "../utils/logger.js";

const claimTrackingLogger = baseLogger.child(
  { avengers: "assemble" },
  { msgPrefix: "[Claims Tracking Job] " },
);

export async function trackClaimsJob() {
  claimTrackingLogger.info("Job started");

  try {
    const slaContractProviders = await getProvidersFromSlaAllocatorContract();

    if (slaContractProviders.length === 0) {
      claimTrackingLogger.info(
        "No storage providers found in SLA Allocator contract, skipping SLI update on oracle contract",
      );
      return;
    }

    const terminatedAllocations: number[] = [];

    for (const spId of slaContractProviders) {
      claimTrackingLogger.info(
        `Tracking claims for storage provider f0${spId}...`,
      );

      const spClients = await getClientsForSPFromClientContract(spId);

      if (spClients.length === 0) {
        claimTrackingLogger.info(
          `No clients found for storage provider ${spId}, skipping...`,
        );
        continue;
      }

      claimTrackingLogger.info(
        `Found ${spClients.length} clients for storage provider ${spId}`,
      );

      const spAllocations = await getClientAllocationIdsPerProvider(
        spId,
        spClients,
      );

      claimTrackingLogger.info(
        `Found ${spAllocations.length} allocations for storage provider ${spId} and its clients`,
      );

      for (const allocationId of spAllocations) {
        const storageProviderId = `f0${spId}`;

        const allocationInfo = await fetchClaims(
          storageProviderId,
          allocationId,
        );

        const sectorInfo = await fetchSectorInfo(
          storageProviderId,
          allocationInfo.Sector,
        );

        if (
          !sectorInfo.ExpectedDayReward ||
          !sectorInfo.ExpectedStoragePledge
        ) {
          terminatedAllocations.push(allocationId);
          claimTrackingLogger.info(
            `Marking allocation ${allocationId} for early termination (SP: ${spId})`,
          );
        }
      }
    }

    await setClaimTerminatedEarly(terminatedAllocations.map(BigInt));
  } catch (err) {
    claimTrackingLogger.error({ err }, "Job failed");
  }

  claimTrackingLogger.info("Job finished");
}
