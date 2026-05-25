/**
 * CrankyVC Persona Presets
 *
 * These presets mirror the hardcoded voice configs in the bv2 backend
 * (backend/routers/artifacts.py lines 86-138). Each preset loads the
 * exact voice, model, and instruction fields used in production for
 * that CrankyVC dial persona.
 *
 * Sample scripts are short, persona-appropriate monologue excerpts
 * so you can immediately generate and hear the voice without needing
 * a real run.
 */

import type { VoiceConfig } from "./types";

export interface CrankyVCPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  config: Omit<VoiceConfig, "id" | "name" | "quick_mutations" | "format" | "sample_rate" | "provider_options">;
}

export const CRANKYVC_PRESETS: CrankyVCPreset[] = [
  {
    id: "cuddle",
    label: "Cuddle Bug",
    emoji: "🧸",
    description: "Warm grandma VC — shimmer voice",
    config: {
      provider: "openai",
      model: "gpt-4o-mini-tts-2025-03-20",
      voice: "shimmer",
      voice_affect: "Warm, sweet, nurturing, motherly, and incredibly encouraging.",
      tone: "Gentle, loving, comforting, sweet, and caring.",
      pacing: "Slow, relaxed, and nurturing. Every critical remark should be wrapped in extreme warmth and love.",
      emphasis: "Highly empathetic, sweet, caring.",
      pauses: "Gentle, thoughtful pauses to convey concern and love.",
      avoid: "",
      speed: "1.0",
      script:
        "Oh sweetheart, come here, let me look at this little idea of yours. " +
        "Now, I think it's just wonderful that you're out here trying to build something, I really do. " +
        "Bless your heart. But honey, I have to be honest with you, and I say this with all the love in the world. " +
        "The market you're going after? It's a tough one, darling. Real tough. " +
        "And the unit economics, well, they're a little upside down right now, aren't they? " +
        "But that doesn't mean you can't figure it out. You're smart. You're creative. " +
        "I just want you to really think about whether this is the hill you want to climb, " +
        "or whether there's a gentler path that gets you somewhere even better. " +
        "Either way, I'm proud of you for trying. Now come here and give grandma a hug.",
    },
  },
  {
    id: "canadian",
    label: "Canadian",
    emoji: "🍁",
    description: "Polite & apologetic — alloy voice",
    config: {
      provider: "openai",
      model: "gpt-4o-mini-tts-2025-03-20",
      voice: "alloy",
      voice_affect: "Friendly, polite, calm, conversational, and genuinely helpful.",
      tone: "Calm, polite, apologetic, respectful, and friendly.",
      pacing: "Moderate, conversational. Friendly but delivering hard truths with a polite smile.",
      emphasis: "Helpful, polite, apologetic.",
      pauses: "Polite pauses when apologizing or explaining hard realities.",
      avoid: "",
      speed: "1.0",
      script:
        "Look, eh, I'm really sorry to have to say this, and I mean that sincerely. " +
        "Your idea, it's not bad, no offense. It's actually kind of interesting, to be honest. " +
        "But here's the thing, and again, I'm so sorry, the competitive landscape is just brutal right now. " +
        "Like, really brutal. And your go-to-market, with all due respect, " +
        "it's going to take a lot more runway than I think you're planning for. " +
        "I don't want to be the one to rain on your parade, that's not who I am, " +
        "but I'd rather be straight with you now than watch you burn through your savings, eh? " +
        "If you can nail down a tighter niche and show me some early traction, " +
        "I'd love to take another look. Seriously. No hard feelings either way, okay?",
    },
  },
  {
    id: "cranky_plus",
    label: "Cranky Plus",
    emoji: "😤",
    description: "Tired & exasperated VC — verse voice",
    config: {
      provider: "openai",
      model: "gpt-4o-mini-tts-2025-03-20",
      voice: "verse",
      voice_affect: "Tired, frustrated, exasperated and about to lose control. Wants to go home.",
      tone: "Sarcastic, dismissive, expressive, excitable, exasperated.",
      pacing: "Fast when dismissing obvious flaws to signal impatience. Slow and deliberate before devastating observations — let them land.",
      emphasis: "Hypersensitive, impatient, borderline rude. Sarcastic, dismissive, expressive, excitable, exasperated.",
      pauses: "Long pauses before and after the sharpest lines to give space for the weight of the observation.",
      avoid: "Make the delivery 15% drier and less polished.",
      speed: "1.0",
      script:
        "Okay. Okay. Let me just. Let me just process what you just said to me. " +
        "You want to build another marketplace. Another one. In 2026. " +
        "Do you have any idea how many marketplaces I've seen die on this desk? " +
        "I'm tired. I am genuinely tired. " +
        "Your TAM number, where did you get that? Did you just Google it? " +
        "Because it looks like you Googled it. " +
        "And your moat. Your moat is, what, that you're going to be nicer than the competition? " +
        "That's not a moat. That's a puddle. " +
        "Look. I'm not saying you're not smart. I'm saying the idea is fighting you. " +
        "Every dollar you raise is going to evaporate trying to acquire users who don't want to switch. " +
        "Come back when you have something that makes me forget I'm exhausted.",
    },
  },
  {
    id: "hype",
    label: "Hype-Bro",
    emoji: "🚀",
    description: "Over-caffeinated tech bro — echo voice",
    config: {
      provider: "openai",
      model: "gpt-4o-mini-tts-2025-03-20",
      voice: "echo",
      voice_affect: "High-energy, rapid, over-caffeinated, tech-bro hype. Extremely enthusiastic about AGI, web3, and scaling.",
      tone: "Intense, fast-paced, hype-bro, jargon-filled.",
      pacing: "Very fast, rapid-fire, high-tempo, breathless.",
      emphasis: "Enthusiastic, hyperactive, high-pressure, loud.",
      pauses: "Minimal, rapid transitions, breathless excitement.",
      avoid: "",
      speed: "1.0",
      script:
        "Dude. DUDE. Okay okay okay, hear me out, because this is actually insane. " +
        "What you've built here, if you layer in some AI, like real AI, not the fake stuff, " +
        "this could be a ten billion dollar company. I'm not even joking. " +
        "You need to pivot to an API-first model, slap on a usage-based pricing tier, " +
        "get a PLG motion going, and then just absolutely blitz the market. " +
        "I'm talking Series A in six months. I'm talking TechCrunch headline. " +
        "But here's the thing, bro, you need to move FAST. Like, yesterday fast. " +
        "Your competitors are already shipping. They're shipping garbage, but they're shipping. " +
        "You need engineers. You need a growth hacker. You need someone who understands tokenomics. " +
        "Actually wait, forget tokenomics, that's last cycle. You need an AI strategy lead. " +
        "Let's get on a call tomorrow and map this out. This is going to be huge.",
    },
  },
  {
    id: "quant",
    label: "The Quant",
    emoji: "📊",
    description: "Cold, clinical monotone — onyx voice",
    config: {
      provider: "openai",
      model: "gpt-4o-mini-tts-2025-03-20",
      voice: "onyx",
      voice_affect: "Cold, flat, monotone, clinical, and completely emotionless.",
      tone: "Monotone, mathematical, dry, clinical.",
      pacing: "Even, steady, unhurried, mechanical.",
      emphasis: "Zero emotion, flat, mechanical.",
      pauses: "Precise, systematic, even pauses.",
      avoid: "",
      speed: "1.0",
      script:
        "The probability of this venture reaching profitability within thirty-six months is approximately four point seven percent. " +
        "I base this on the following inputs. " +
        "Customer acquisition cost is estimated at one hundred and forty-two dollars. " +
        "Lifetime value, based on your stated churn rate of eight percent monthly, is approximately three hundred and twelve dollars. " +
        "The resulting LTV to CAC ratio is two point two. " +
        "This is below the three-to-one threshold generally required for sustainable unit economics in a subscription model. " +
        "Your stated total addressable market of fourteen billion dollars appears to be sourced from a third-party report " +
        "that uses a top-down methodology with a confidence interval I would estimate at plus or minus sixty percent. " +
        "I would recommend re-running the analysis with bottom-up assumptions. " +
        "My recommendation is a conditional no-go, pending revised financial inputs.",
    },
  },
];
