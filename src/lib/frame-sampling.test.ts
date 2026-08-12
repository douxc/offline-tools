import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sampleFramesByInterval,
  sampleFramesByStep,
  sampleFramesEvenly,
  type SamplingMode,
} from "./frame-sampling";

describe("sampleFramesByInterval", () => {
  it("AC-1: returns time points stepping by intervalSeconds, strictly < duration", () => {
    assert.deepEqual(sampleFramesByInterval(10, 2), [0, 2, 4, 6, 8]);
  });

  it("AC-2: returns [0] when intervalSeconds >= duration", () => {
    assert.deepEqual(sampleFramesByInterval(5, 5), [0]);
    assert.deepEqual(sampleFramesByInterval(3, 10), [0]);
  });
});

describe("sampleFramesByStep", () => {
  it("AC-3: returns time points stepping by frameStep/fps, strictly < duration", () => {
    assert.deepEqual(sampleFramesByStep(1, 10, 2), [0, 0.2, 0.4, 0.6, 0.8]);
  });
});

describe("sampleFramesEvenly", () => {
  it("AC-4: returns count evenly distributed points at duration*i/count", () => {
    assert.deepEqual(sampleFramesEvenly(10, 4), [0, 2.5, 5, 7.5]);
  });

  it("AC-5: returns [0] when count is 1", () => {
    assert.deepEqual(sampleFramesEvenly(8, 1), [0]);
  });
});

describe("SamplingMode", () => {
  it("AC-6: SamplingMode is the union of the three mode literals", () => {
    const modes: SamplingMode[] = ["interval", "step", "evenly"];
    assert.deepEqual(modes, ["interval", "step", "evenly"]);
  });
});
