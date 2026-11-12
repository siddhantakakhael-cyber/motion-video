import React from "react";
import {Composition} from "remotion";
import {DiwaliVideo, totalFrames} from "./Composition";
import {DiwaliEditorial} from "./DiwaliEditorial";
import {ResearchUnit1, researchUnit1Frames} from "./ResearchUnit1";

export const RemotionRoot: React.FC = () => <>
  <Composition id="DiwaliHindiFacts" component={DiwaliVideo} durationInFrames={totalFrames} fps={30} width={1280} height={720} />
  <Composition id="ResearchUnit1" component={ResearchUnit1} durationInFrames={researchUnit1Frames} fps={30} width={720} height={1280} />
  <Composition id="DiwaliEditorial" component={DiwaliEditorial} durationInFrames={540} fps={30} width={720} height={1280} />
</>;
