import { DealState } from "../../utils/types";

export const toPrismaDealState = (state: DealState) => state as never;

export const toDomainDealState = (state: unknown) => state as DealState;
