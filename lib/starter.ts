import { generateStoryboard } from "./ai";

export const STARTER_SCRIPT = `You do not need more time.

You need fewer open tabs in your head.

Pick one thing. Give it ninety honest minutes.

Not because it is easy — because it is yours.

The work will still be hard tomorrow. But you will be less afraid of it.

Start ugly. Start today.`;

export function starterProject() {
  const project = generateStoryboard({
    script: STARTER_SCRIPT,
    style: "bold",
    aspect: "9:16",
    brand: "@motionstudio",
    title: "The Quiet Advantage",
    includeTitle: true,
    includeCTA: true,
    ctaText: "Follow for more",
    wpm: 150,
  });
  return { ...project, name: "The Quiet Advantage" };
}
