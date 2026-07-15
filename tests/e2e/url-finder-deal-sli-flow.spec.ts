import { SERVICE_CONFIG } from "../../src/config/env";
import { createOrUpdatePoRepDealSliTargetInUrlFinder } from "../../src/services/url-finder-service";
import { buildActivePorepMarketDeal } from "../fixtures/porep-market-deal.fixture";
import {
  getLatestDealSliEvidence,
  hasAnySliValue,
  triggerDealMeasurementRun,
} from "../helpers/url-finder-api";
import {
  describeExchange,
  recordUrlFinderExchanges,
  RecordedExchange,
} from "../helpers/url-finder-recorder";

describe("oracle-service to RPA deal measurement flow", () => {
  const deal = buildActivePorepMarketDeal();
  const dealId = deal.onChainDealId;

  let recorder: ReturnType<typeof recordUrlFinderExchanges>;

  beforeAll(() => {
    if (!SERVICE_CONFIG.URL_FINDER_AUTH_TOKEN) {
      throw new Error(
        "URL_FINDER_AUTH_TOKEN is not set. PUT /deals/{deal_id} and " +
          "POST /deals/{deal_id}/runs require an oracle bearer token.",
      );
    }
  });

  beforeEach(() => {
    recorder = recordUrlFinderExchanges();
  });

  afterEach(() => {
    recorder.restore();
  });

  it("registers the deal, runs a measurement, and reads back its SLI evidence", async () => {
    const wasRegistered =
      await createOrUpdatePoRepDealSliTargetInUrlFinder(deal);

    const exchange: RecordedExchange | undefined = recorder.exchanges.at(-1);

    if (!wasRegistered) {
      throw new Error(
        `URL Finder rejected deal ${dealId}. ${describeExchange(exchange)}`,
      );
    }
    expect(wasRegistered).toBe(true);

    // runs a measurement for the deal
    const run = await triggerDealMeasurementRun(dealId);
    expect(run.deal_id).toBe(dealId.toString());
    expect(run.measurement_state).not.toBe("missing");
    expect(run.piece_count).toBeGreaterThan(0);

    // reads the latest deal SLI evidence back
    const latest = await getLatestDealSliEvidence(dealId);
    expect(latest.deal_id).toBe(dealId.toString());
    expect(latest.measurement_state).not.toBe("missing");
    expect(latest.tested_at).toBeTruthy();
  });

});
