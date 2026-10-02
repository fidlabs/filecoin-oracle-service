import { encodeAbiParameters } from "viem";
import { SectorLocation } from "./types";

export const NO_DEADLINE = -1n;
export const NO_PARTITION = -1n;

export function encodeSectorLocationsEvidenceData(
  locations: SectorLocation[],
): `0x${string}` {
  return encodeAbiParameters(
    [
      {
        type: "tuple[]",
        components: [
          { name: "deadline", type: "int64" },
          { name: "partition", type: "int64" },
        ],
      },
    ],
    [locations],
  );
}
