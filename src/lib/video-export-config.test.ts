import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BITRATE_PRESETS,
  chooseBitrate,
  pickRecorderMime,
} from "./video-export-config";

describe("BITRATE_PRESETS", () => {
  it("AC-4: low/medium/high are positive and ordered", () => {
    assert.ok(BITRATE_PRESETS.low > 0);
    assert.ok(BITRATE_PRESETS.medium > 0);
    assert.ok(BITRATE_PRESETS.high > 0);
    assert.ok(BITRATE_PRESETS.low < BITRATE_PRESETS.medium);
    assert.ok(BITRATE_PRESETS.medium < BITRATE_PRESETS.high);
  });
});

describe("chooseBitrate", () => {
  it("AC-5: returns the preset for the given level", () => {
    assert.equal(chooseBitrate("medium"), BITRATE_PRESETS.medium);
    assert.equal(chooseBitrate("high"), BITRATE_PRESETS.high);
  });
});

describe("pickRecorderMime", () => {
  it("AC-6: returns null when MediaRecorder is unavailable", () => {
    assert.equal(pickRecorderMime(() => true, false), null);
  });

  it("AC-7: returns vp9+opus MIME when supported", () => {
    assert.equal(
      pickRecorderMime((mime) => mime === "video/webm;codecs=vp9,opus", true),
      "video/webm;codecs=vp9,opus",
    );
  });

  it("AC-8: falls back to vp8+opus when vp9 is unsupported", () => {
    assert.equal(
      pickRecorderMime((mime) => mime === "video/webm;codecs=vp8,opus", true),
      "video/webm;codecs=vp8,opus",
    );
  });

  it("AC-9: returns null when no candidate MIME is supported", () => {
    assert.equal(pickRecorderMime(() => false, true), null);
  });
});
