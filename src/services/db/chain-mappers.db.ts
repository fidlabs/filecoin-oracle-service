import { SectorStatus } from "../../../prisma/generated/client";
import { DealState, PorepMarketContractDealState } from "../../utils/types";

export const getChainStateToDomain = (state: number): DealState => {
  switch (state) {
    case PorepMarketContractDealState.None:
      return DealState.None;
    case PorepMarketContractDealState.Proposed:
      return DealState.Proposed;
    case PorepMarketContractDealState.Accepted:
      return DealState.Accepted;
    case PorepMarketContractDealState.Active:
      return DealState.Active;
    case PorepMarketContractDealState.Finalized:
      return DealState.Finalized;
    case PorepMarketContractDealState.Rejected:
      return DealState.Rejected;
    case PorepMarketContractDealState.Expired:
      return DealState.Expired;
    case PorepMarketContractDealState.Terminated:
      return DealState.Terminated;
    default:
      throw new Error(`Unknown state from chain: ${state}`);
  }
};

export const getChainSectorStatusToDomain = (status: number) => {
  switch (status) {
    case 0:
      return SectorStatus.Dead;
    case 1:
      return SectorStatus.Active;
    case 2:
      return SectorStatus.Faulty;
    default:
      throw new Error(`Unknown sector status from chain: ${status}`);
  }
};
