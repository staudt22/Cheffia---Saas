import React from "react";
import { Composition, Still } from "remotion";
import "./fonts";
import { CharacterSheet } from "./dev/CharacterSheet";
import { SceneGallery } from "./dev/SceneGallery";
import { EPISODES } from "../episodes";
import { EpisodeVideo } from "./episode/EpisodeVideo";
import { FPS, W, H } from "./core/anim";

export const Root: React.FC = () => (
  <>
    <Composition id="CharacterSheet" component={CharacterSheet} durationInFrames={300} fps={FPS} width={W} height={H} defaultProps={{ page: 0 }} />
    <Composition id="SceneGallery" component={SceneGallery} durationInFrames={300} fps={FPS} width={W} height={H} defaultProps={{ scene: "street" as const }} />
    {EPISODES.map((ep) => (
      <React.Fragment key={ep.id}>
        <Composition
          id={ep.id}
          component={EpisodeVideo}
          durationInFrames={Math.max(1, Math.ceil(ep.timeline.duration * FPS))}
          fps={FPS}
          width={W}
          height={H}
          defaultProps={{ episodeId: ep.id }}
        />
        {ep.Thumbnail && <Still id={`${ep.id}-thumb`} component={ep.Thumbnail} width={1280} height={720} />}
      </React.Fragment>
    ))}
  </>
);
