export interface SpreadTheme {
  id: string;
  headline: string;
  slotLabels: [string, string, string];
  slotLabelVariants?: Array<[string, string, string]>;
  slotTemplates: [string[], string[], string[]];
}

function tpl(...lines: string[]): string[] {
  return lines;
}

export const SPREAD_THEMES: SpreadTheme[] = [
  {
    id: "neighbors",
    headline:
      "Who lives left of me, above me, and right of me — Wikipedia edition.",
    slotLabels: ["Left of me", "Above me", "Right of me"],
    slotLabelVariants: [
      ["Left of me", "Above me", "Right of me"],
      ["Side street", "Top frame", "Window right"],
      ["Lane left", "Skyline", "Lane right"],
    ],
    /* storyVariant 0|1|2 picks the same index on every column — read left → right as one arc. */
    slotTemplates: [
      tpl(
        "You step out: {title} on your left, {category} in quiet stereo with whatever you thought today would sound like.",
        "The block begins leftward with {title}; {category} sidles alongside like a friend who never needs the middle of the sidewalk.",
        "{title} borrows your left lane, all {keyword}, {category} pacing you without honking once.",
      ),
      tpl(
        "Lift your chin — {title} owns the overhead; {keyword} in {category} is the weather that decides the light on everyone below.",
        "{title} hangs where ceilings go; {keyword} presses {category} down soft until every footstep feels choreographed from above.",
        "Above, {title} widens the story; {category} opens like sky — big enough to hold what the street cannot say.",
      ),
      tpl(
        "Finish the glance right: {title} answers the row — {category} parallel, the neighbor who says you are almost home.",
        "The right-hand pane is {title}; {category} mirrors the left without copying — two beats, one strip.",
        "{title} on the right closes the arc; {category} lifts a hand as if to whisper, I saw it too, keep walking.",
      ),
    ],
  },
  {
    id: "predictions-2026",
    headline: "My 2026 predictions — three random Wikipedia cards decide nothing (but go off).",
    slotLabels: ["January–April energy", "May–August plot twist", "September–December finale"],
    slotLabelVariants: [
      ["January–April energy", "May–August plot twist", "September–December finale"],
      ["Q1 setup", "Q2/Q3 chaos arc", "Q4 credits scene"],
      ["Cold open", "Main season twist", "Finale reel"],
    ],
    slotTemplates: [
      tpl(
        "January through April opens on {title}; {category} tiptoes into the year while frost still clicks underfoot.",
        "The cold half bets on {title} first; {category} arrives like a letter slid under a door you forgot you locked.",
        "Q1 whispers {title}; {category} keeps its voice low until the rest of the plot shows up.",
      ),
      tpl(
        "May through August swerves hard on {title}; {keyword} twists {category} into the summer nobody table-read together.",
        "Midyear heat picks {title} anyway; {keyword} in {category} refuses the outline you drew back in spring.",
        "Q2 throws {title} center heat; {category} changes tempo; {keyword} is the hook you hum without meaning to.",
      ),
      tpl(
        "September through December lands on {title}; {category} buttons its coat and leaves one streetlamp on for the encore.",
        "The year's end kneels to {title}; {category} hums the last chord while the light below refuses to cut.",
        "Q3 and Q4 crown {title}; {category} walks off slow, coat over shoulder, one thread still shining.",
      ),
    ],
  },
  {
    id: "ex-lover-spouse",
    headline: "My ex, my lover, my marriage partner — as random encyclopedia articles.",
    slotLabels: ["My ex", "My lover", "My marriage partner"],
    slotLabelVariants: [
      ["My ex", "My lover", "My marriage partner"],
      ["Closed chapter", "Current spark", "Future vows"],
      ["Past flame", "Present desire", "Long-term promise"],
    ],
    slotTemplates: [
      tpl(
        "The old story names {title} — {category} you shelved after the last goodbye.",
        "{title} was the chapter you dog-eared then closed — {category} filed under survived, not revisited.",
        "First beat: you walk away from {title} in {category} — clean break, no encore on tonight’s bill.",
      ),
      tpl(
        "The new gravity is {title}; {keyword} in {category} reckless, bright, impossible to pretend away.",
        "Now the pulse skips for {title}; {keyword} in {category} tastes like hours you steal on purpose.",
        "Second beat: {title} texts after midnight; {category} neon-wet, {keyword} humming in your ribs.",
      ),
      tpl(
        "The long game chooses {title}; {category} with coffee, keys, and a calendar that knows your real name.",
        "What lasts whispers {title}; {category} you pick again on purpose when the glitter finally thins.",
        "Third beat: {title} stays for breakfast; {category} steady as a vow you speak aloud without flinching.",
      ),
    ],
  },
  {
    id: "fyp-algorithm",
    headline: "What the FYP thinks I am vs. what I am vs. what I’ll become.",
    slotLabels: ["What the FYP thinks I am", "What I actually am", "What I’ll become"],
    slotLabelVariants: [
      ["What the FYP thinks I am", "What I actually am", "What I’ll become"],
      ["Edited version", "Unfiltered self", "Next evolution"],
      ["Trending persona", "Off-camera truth", "Future feed"],
    ],
    slotTemplates: [
      tpl(
        "The algorithm casts you as {title} — {category} trimmed into a costume two sizes too loud.",
        "They sell a caricature called {title}; {category} as a punchline you did not write.",
        "The crowd reads {title} wrong on purpose — {category} flattened to one sparkle emoji.",
      ),
      tpl(
        "Once the noise drops, you are {title}; {keyword} in {category} slower, stranger, and truer than the skim.",
        "Underneath breathes {title}; {keyword} in {category} like a handshake only insiders know.",
        "You answer with {title}; {category} without autotune, still magnetic in the dark.",
      ),
      tpl(
        "Ahead, {title} keeps your seat warm; {category} gathers into who you are still walking toward.",
        "Ahead bends toward {title}; {category} aging into legend by inches, not by views.",
        "Tomorrow inherits {title}; {keyword} in {category} the cold open nobody scrolls past twice.",
      ),
    ],
  },
  {
    id: "red-flags-green-flags",
    headline: "Green flag, beige flag, red flag — Wikipedia pulls the mood board.",
    slotLabels: ["Green flag", "Beige flag", "Red flag"],
    slotLabelVariants: [
      ["Green flag", "Beige flag", "Red flag"],
      ["Safe bet", "Could go either way", "Run now"],
      ["Keep", "Maybe", "Block"],
    ],
    slotTemplates: [
      tpl(
        "First read: {title} gets a warm yes — {category} you would bring home to the people who know your worst.",
        "Second read: {title} shrugs in {category} — fine, odd, impossible to love or leave.",
        "Third read: {title} flashes danger-soft — {category} that asks too much, too fast, too sweet.",
      ),
      tpl(
        "{title} opens the door — {category} clean as sunrise on an empty road.",
        "Then {title} arrives in neutral gray; {keyword} in {category} neither rescues nor ruins the afternoon.",
        "Last pass hesitates on {title}; {category} trips the switch you pretend not to have.",
      ),
      tpl(
        "The yes lights up on {title}; {category} steady, square, kind without trying.",
        "The middle holds {title}; {category} a shrug pressed between two stronger feelings.",
        "The no flickers on {title}; {keyword} in {category} leaves a knot you still cannot name out loud.",
      ),
    ],
  },
];

export function pickRandomTheme(): SpreadTheme {
  const i = Math.floor(Math.random() * SPREAD_THEMES.length);
  const theme = SPREAD_THEMES[i] ?? SPREAD_THEMES[0]!;
  const variants = theme.slotLabelVariants ?? [theme.slotLabels];
  const labels = variants[Math.floor(Math.random() * variants.length)] ?? theme.slotLabels;
  return {
    ...theme,
    slotLabels: labels,
  };
}
