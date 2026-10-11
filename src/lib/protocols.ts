import type { LucideIcon } from "lucide-react";
import { Armchair, Hand, MoveVertical, PersonStanding, RotateCw, Waves } from "lucide-react";

export interface StretchProtocol {
  id: string;
  title: string;
  area: string;
  durationSec: number;
  icon: LucideIcon;
  summary: string;
  steps: string[];
  tip: string;
}

export const PROTOCOLS: StretchProtocol[] = [
  {
    id: "spinal-twist",
    title: "Seated Spinal Twist",
    area: "Spine & lower back",
    durationSec: 40,
    icon: RotateCw,
    summary: "Releases compression built up from long periods of sitting.",
    steps: [
      "Sit tall with both feet flat on the floor.",
      "Place your right hand on your left knee and your left hand on the chair back.",
      "Inhale to lengthen your spine, exhale to rotate gently to the left.",
      "Hold for 20 seconds, then switch sides.",
    ],
    tip: "Lead the twist from your ribcage, not your neck.",
  },
  {
    id: "wrist-extension",
    title: "Wrist Extension & Flexion",
    area: "Wrists & forearms",
    durationSec: 40,
    icon: Hand,
    summary: "Counteracts repetitive strain from typing and mouse use.",
    steps: [
      "Extend your right arm forward, palm facing up.",
      "With the other hand, gently draw the fingers down toward the floor.",
      "Hold 10 seconds, then flip the palm down and draw the fingers toward you.",
      "Repeat on the other arm.",
    ],
    tip: "Keep the elbow soft — stretch should feel mild, never sharp.",
  },
  {
    id: "neck-release",
    title: "Lateral Neck Release",
    area: "Neck & upper traps",
    durationSec: 30,
    icon: MoveVertical,
    summary: "Eases tension from screen-forward posture.",
    steps: [
      "Sit tall and drop both shoulders away from your ears.",
      "Tilt your right ear toward your right shoulder.",
      "Rest your right hand lightly on your head — no pulling.",
      "Breathe slowly for 15 seconds, then switch sides.",
    ],
    tip: "Reach the opposite hand toward the floor to deepen the stretch.",
  },
  {
    id: "cat-cow",
    title: "Seated Cat–Cow",
    area: "Mid & upper back",
    durationSec: 40,
    icon: Waves,
    summary: "Mobilises the thoracic spine and wakes up your posture.",
    steps: [
      "Place your hands on your knees with your spine neutral.",
      "Inhale: arch your back, lift your chest and look slightly up.",
      "Exhale: round your spine and tuck your chin toward your chest.",
      "Flow between both shapes for 6–8 breaths.",
    ],
    tip: "Move with your breath rather than rushing the rhythm.",
  },
  {
    id: "chest-opener",
    title: "Shoulder Roll & Chest Opener",
    area: "Shoulders & chest",
    durationSec: 35,
    icon: PersonStanding,
    summary: "Opens the front of the body that rounds forward at a desk.",
    steps: [
      "Roll both shoulders up, back and down five times.",
      "Interlace your fingers behind your back (or hold a towel).",
      "Straighten your arms and lift slightly while opening the chest.",
      "Hold for 15 seconds, breathing steadily.",
    ],
    tip: "Keep your ribs knitted in so you don't over-arch the lower back.",
  },
  {
    id: "figure-four",
    title: "Seated Figure-Four",
    area: "Hips & glutes",
    durationSec: 40,
    icon: Armchair,
    summary: "Targets the hip rotators that tighten during prolonged sitting.",
    steps: [
      "Cross your right ankle over your left knee.",
      "Keep the right foot flexed to protect the knee.",
      "Hinge forward from the hips with a long spine until you feel a stretch.",
      "Hold 20 seconds, then switch legs.",
    ],
    tip: "Press gently on the raised knee to deepen the opening.",
  },
];

/** Picks `count` protocols, rotating the starting point so breaks stay varied. */
export function pickProtocols(rotation: number, count = 4): StretchProtocol[] {
  return Array.from({ length: count }, (_, i) => PROTOCOLS[(rotation + i) % PROTOCOLS.length]);
}
