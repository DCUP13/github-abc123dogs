import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, RotateCcw, MessageCircle } from 'lucide-react';

interface RabbitHoleProps {
  onBackClick: () => void;
}

interface QuizStep {
  question: string;
  options: { text: string; identity: string }[];
}

const QUIZ_STEPS: QuizStep[] = [
  {
    question: "Be honest. Why are you really here?",
    options: [
      { text: "I'm drowning in emails and need a lifeline.", identity: "someone who's ready to be rescued" },
      { text: "I keep hearing 'automation' but I'm skeptical.", identity: "someone who researches before they invest" },
      { text: "I want my evenings back.", identity: "someone who values their time" },
      { text: "My competitors are doing something I'm not.", identity: "someone who refuses to be left behind" },
    ],
  },
  {
    question: "Let's say your inbox handled itself tomorrow. What changes?",
    options: [
      { text: "I finally answer leads before they go cold.", identity: "someone who closes deals" },
      { text: "I stop dreading the little red notification dot.", identity: "someone who wants peace of mind" },
      { text: "I have time to actually grow the business.", identity: "someone who thinks bigger than busywork" },
      { text: "I stop missing the important ones buried in spam.", identity: "someone who can't afford to miss opportunities" },
    ],
  },
  {
    question: "What's actually been stopping you?",
    options: [
      { text: "It feels complicated to set up.", identity: "someone who wants done-for-you simplicity" },
      { text: "I'm not sure AI can sound like me.", identity: "someone who cares about their brand voice" },
      { text: "I've been burned by tools before.", identity: "someone who's due for something that works" },
      { text: "Honestly? I just haven't made the time.", identity: "someone who's ready to stop waiting" },
    ],
  },
  {
    question: "If your emails answered themselves, what would you do with the hours back?",
    options: [
      { text: "Close more deals. Obviously.", identity: "someone driven by revenue" },
      { text: "Be present with my family again.", identity: "someone who remembers what matters" },
      { text: "Build the thing I've been putting off for a year.", identity: "someone with untapped ambition" },
      { text: "Finally take a real lunch break.", identity: "someone who deserves a break" },
    ],
  },
  {
    question: "Last one. You've made it this far. What does that tell you?",
    options: [
      { text: "I'm more ready than I've been admitting.", identity: "someone who's already decided" },
      { text: "I'm at least curious enough to see what's next.", identity: "someone who follows through on curiosity" },
      { text: "I don't waste time on things that aren't for me.", identity: "someone who trusts their instincts" },
      { text: "I'm done reading. I want to see it work.", identity: "someone who takes action" },
    ],
  },
];

const EMOJIS = ['✨', '🎉', '🚀', '💼', '⚡', '🎯', '🔥', '💡', '⭐', '💫'];

function DodgingButton() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [escaped, setEscaped] = useState(0);
  const [bursts, setBursts] = useState<{ id: number; emoji: string; dx: number; dy: number }[]>([]);
  const [resetTimer, setResetTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const escape = useCallback(() => {
    const btn = buttonRef.current;
    const container = containerRef.current;
    if (!btn || !container) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    // Random direction, keep within container
    const maxDX = (containerRect.width - btnRect.width) / 2 - 20;
    const maxDY = (containerRect.height - btnRect.height) / 2 - 20;
    const dx = (Math.random() * 2 - 1) * maxDX;
    const dy = (Math.random() * 2 - 1) * maxDY;

    setPos({ x: dx, y: dy });
    setEscaped(e => e + 1);

    // Emoji burst
    const newBursts = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      dx: (Math.random() * 2 - 1) * 60,
      dy: (Math.random() * 2 - 1) * 60 - 30,
    }));
    setBursts(prev => [...prev, ...newBursts]);
    setTimeout(() => {
      setBursts(prev => prev.filter(b => !newBursts.some(nb => nb.id === b.id)));
    }, 1000);

    // Reset after cursor stays away
    if (resetTimer) clearTimeout(resetTimer);
    setResetTimer(setTimeout(() => {
      setPos({ x: 0, y: 0 });
    }, 2500));
  }, [resetTimer]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center min-h-[180px] w-full"
    >
      {/* Emoji bursts layer */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
        {bursts.map(b => (
          <span
            key={b.id}
            className="absolute text-2xl"
            style={{
              animation: 'burst 1s ease-out forwards',
              ['--burst-dx' as string]: `${b.dx}px`,
              ['--burst-dy' as string]: `${b.dy}px`,
            }}
          >
            {b.emoji}
          </span>
        ))}
      </div>

      <button
        ref={buttonRef}
        onMouseEnter={escape}
        onTouchStart={escape}
        className="px-8 py-4 bg-om-gold text-om-forest-deep font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-shadow relative z-10 select-none"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        Book a Call
        {escaped > 2 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {escaped}
          </span>
        )}
      </button>

      <style>{`
        @keyframes burst {
          0% { transform: translate(0, 0) scale(0.5); opacity: 1; }
          100% { transform: translate(var(--burst-dx), var(--burst-dy)) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function RabbitHole({ onBackClick }: RabbitHoleProps) {
  const [step, setStep] = useState(0);
  const [identities, setIdentities] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (identity: string) => {
    const newIdentities = [...identities, identity];
    setIdentities(newIdentities);
    if (step + 1 < QUIZ_STEPS.length) {
      setStep(step + 1);
    } else {
      setFinished(true);
    }
  };

  const restart = () => {
    setStep(0);
    setIdentities([]);
    setFinished(false);
  };

  // Determine the fun title based on collected identities
  const getFunTitle = () => {
    const hasAction = identities.some(i => i.includes('action') || i.includes('decided'));
    const hasSkeptic = identities.some(i => i.includes('skeptical') || i.includes('researches'));
    if (hasAction) return "The Impatient Opportunist";
    if (hasSkeptic) return "The Converted Skeptic";
    return "The Quietly Ready";
  };

  if (finished) {
    return (
      <div className="min-h-screen bg-om-cream font-body flex flex-col items-center justify-center px-6">
        <div className="max-w-lg w-full text-center">
          <p className="text-om-gold text-sm tracking-widest uppercase mb-3">Quiz Complete</p>
          <h1 className="text-3xl md:text-4xl font-display font-semibold text-om-forest-deep mb-4">
            You are: {getFunTitle()}
          </h1>
          <p className="text-lg text-om-mahogany mb-8" style={{ fontFamily: "'EB Garamond', serif" }}>
            You've just talked yourself into it. Five questions, five honest answers, and look at you now —
            someone who's ready. So go ahead. Try to book a call.
          </p>

          <DodgingButton />

          <div className="mt-8 border-t border-om-tan pt-6">
            <p className="text-sm text-om-brown mb-2">Or, you know, just do the easy thing:</p>
            <a
              href="https://wa.me/15555555555"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-om-forest-deep hover:text-om-forest font-medium text-lg transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              Message me on WhatsApp
            </a>
          </div>

          <button
            onClick={restart}
            className="mt-10 inline-flex items-center gap-2 text-sm text-om-brown hover:text-om-mahogany transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Take the quiz again
          </button>

          <button
            onClick={onBackClick}
            className="mt-4 block mx-auto text-sm text-om-brown hover:text-om-mahogany transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const current = QUIZ_STEPS[step];

  return (
    <div className="min-h-screen bg-om-cream font-body flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {QUIZ_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-om-forest' : 'bg-om-tan/40'}`}
            />
          ))}
        </div>

        <p className="text-om-gold text-sm tracking-widest uppercase mb-3">
          The Rabbit Hole · Step {step + 1} of {QUIZ_STEPS.length}
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-om-forest-deep mb-6 leading-tight">
          {current.question}
        </h1>

        <div className="space-y-3">
          {current.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt.identity)}
              className="w-full text-left px-5 py-4 bg-om-parchment border border-om-tan rounded-lg text-om-forest-deep hover:border-om-gold hover:bg-om-gold/5 transition-all group flex items-center justify-between gap-3"
            >
              <span className="text-base md:text-lg">{opt.text}</span>
              <ArrowRight className="w-5 h-5 text-om-brown opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>

        <button
          onClick={onBackClick}
          className="mt-8 text-sm text-om-brown hover:text-om-mahogany transition-colors"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
