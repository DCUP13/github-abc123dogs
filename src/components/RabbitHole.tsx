import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
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

const BURST_EMOJIS = ['✨', '🎉', '🚀', '💼', '⚡', '🎯', '🔥', '💡', '⭐', '💫', '💨', '🏃', '😂', '🙈'];
const BURST_TEXTS = ['sorry', 'oops', 'message me on whatsapp', 'try whatsapp', 'bro stop', 'bruh', 'nah', 'catch me', 'lol no', 'nice try', 'almost!', 'too slow', 'nope', 'gotcha'];

interface Burst {
  id: number;
  content: string;
  isText: boolean;
  dx: number;
  dy: number;
}

function DodgingButton() {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [escaped, setEscaped] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const posRef = useRef(pos);
  const burstIdRef = useRef(0);

  // Center the button precisely on mount once we can measure it.
  useLayoutEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const w = btn.offsetWidth;
    const h = btn.offsetHeight;
    const cx = (window.innerWidth - w) / 2;
    const cy = (window.innerHeight - h) / 2;
    setPos({ x: cx, y: cy });
    posRef.current = { x: cx, y: cy };
  }, []);

  const flee = useCallback((mouseX: number, mouseY: number) => {
    const btn = buttonRef.current;
    if (!btn) return;
    const w = btn.offsetWidth;
    const h = btn.offsetHeight;
    const cx = posRef.current.x + w / 2;
    const cy = posRef.current.y + h / 2;

    // Vector from the mouse to the button center — the button flees along it.
    const dx = cx - mouseX;
    const dy = cy - mouseY;
    const dist = Math.hypot(dx, dy);
    const threshold = 140;
    if (dist > threshold || dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const fleeDist = 240;
    const margin = 16;
    const bottomMargin = 48;

    let newX = posRef.current.x + nx * fleeDist;
    let newY = posRef.current.y + ny * fleeDist;
    newX = Math.max(margin, Math.min(window.innerWidth - w - margin, newX));
    newY = Math.max(margin, Math.min(window.innerHeight - h - bottomMargin, newY));

    posRef.current = { x: newX, y: newY };
    setPos({ x: newX, y: newY });
    setEscaped(e => e + 1);

    // Spawn bursts that originate from the button's new position.
    const count = 4 + Math.floor(Math.random() * 3);
    const newBursts: Burst[] = Array.from({ length: count }).map((_, i) => {
      const useText = i === 0 ? true : Math.random() < 0.45;
      return {
        id: burstIdRef.current++,
        content: useText
          ? BURST_TEXTS[Math.floor(Math.random() * BURST_TEXTS.length)]
          : BURST_EMOJIS[Math.floor(Math.random() * BURST_EMOJIS.length)],
        isText: useText,
        dx: (Math.random() * 2 - 1) * 90,
        dy: (Math.random() * 2 - 1) * 90 - 40,
      };
    });
    setBursts(prev => [...prev, ...newBursts]);
    const ids = newBursts.map(b => b.id);
    setTimeout(() => {
      setBursts(prev => prev.filter(b => !ids.includes(b.id)));
    }, 1200);
  }, []);

  // Track the mouse/touch across the whole viewport so the button flees
  // based on the direction the cursor is approaching from.
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => flee(e.clientX, e.clientY);
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) flee(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('touchstart', handleTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [flee]);

  // Keep the button on-screen when the window resizes.
  useEffect(() => {
    const handleResize = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const w = btn.offsetWidth;
      const h = btn.offsetHeight;
      const margin = 16;
      posRef.current = {
        x: Math.max(margin, Math.min(window.innerWidth - w - margin, posRef.current.x)),
        y: Math.max(margin, Math.min(window.innerHeight - h - 48, posRef.current.y)),
      };
      setPos(posRef.current);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <div
        style={{ position: 'fixed', left: pos.x, top: pos.y, pointerEvents: 'none', zIndex: 50 }}
      >
        <button
          ref={buttonRef}
          style={{ pointerEvents: 'auto' }}
          className="px-8 py-4 bg-om-gold text-om-forest-deep font-bold text-lg rounded-lg shadow-xl relative select-none whitespace-nowrap"
        >
          Book a Call
          {escaped > 2 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow">
              {escaped}
            </span>
          )}
        </button>

        {/* "1/3 slots available" follows the button */}
        <div
          style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 10, whiteSpace: 'nowrap' }}
          className="text-xs font-semibold tracking-wide text-om-mahogany bg-om-parchment/90 px-3 py-1 rounded-full border border-om-tan shadow-sm"
        >
          1/3 slots available
        </div>

        {/* Bursts originate from the button center */}
        {bursts.map(b => (
          <span
            key={b.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              animation: 'burst 1.2s ease-out forwards',
              ['--burst-dx' as string]: `${b.dx}px`,
              ['--burst-dy' as string]: `${b.dy}px`,
            }}
          >
            {b.isText ? (
              <span className="block px-2.5 py-1 bg-om-gold/90 text-om-forest-deep text-xs font-bold rounded-full whitespace-nowrap shadow-md">
                {b.content}
              </span>
            ) : (
              <span className="block text-2xl">{b.content}</span>
            )}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes burst {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--burst-dx)), calc(-50% + var(--burst-dy))) scale(1.2); opacity: 0; }
        }
      `}</style>
    </>
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

  if (finished) {
    return (
      <div className="min-h-screen bg-om-cream font-body relative overflow-hidden">
        {/* Heading */}
        <div className="pt-16 md:pt-20 pb-8 text-center px-6 relative z-10">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-om-forest-deep leading-tight">
            Cook the Competition
          </h1>
          <p className="mt-5 text-base md:text-xl text-om-mahogany max-w-xl mx-auto leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>
            We make sure your leads don't go to your competition. Or we'll help your competition. Choose wisely.
          </p>
        </div>

        {/* Full-screen dodging button overlay */}
        <DodgingButton />

        {/* Bottom actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-center z-10">
          <p className="text-sm text-om-brown mb-2">Fine. You win. Do the easy thing:</p>
          <a
            href="https://wa.me/15555555555"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-om-forest-deep hover:text-om-forest font-medium text-lg transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
            Message me on WhatsApp
          </a>
          <div className="mt-6 flex items-center justify-center gap-5">
            <button
              onClick={restart}
              className="inline-flex items-center gap-2 text-sm text-om-brown hover:text-om-mahogany transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Take the quiz again
            </button>
            <button
              onClick={onBackClick}
              className="inline-flex items-center text-sm text-om-brown hover:text-om-mahogany transition-colors"
            >
              Back to home
            </button>
          </div>
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
