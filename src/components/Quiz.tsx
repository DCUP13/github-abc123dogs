import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { ArrowRight, RotateCcw, MessageCircle } from 'lucide-react';

interface QuizProps {
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
      { text: "I want my evenings back.", identity: "someone who values their time" },
    ],
  },
  {
    question: "If your emails answered themselves, what would you do with the hours back?",
    options: [
      { text: "Close more deals. Obviously.", identity: "someone driven by revenue" },
      { text: "Be present with my family again.", identity: "someone who remembers what matters" },
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
  const lastMoveRef = useRef(0);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const recenterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Center the button precisely on mount once we can measure it.
  useLayoutEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const w = btn.offsetWidth;
    const h = btn.offsetHeight;
    const cx = (window.innerWidth - w) / 2;
    const cy = (window.innerHeight - h) / 2 + 60;
    setPos({ x: cx, y: cy });
    posRef.current = { x: cx, y: cy };
    centerRef.current = { x: cx, y: cy };
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

    // Let the current glide finish before accepting a new target,
    // otherwise mousemove fires so often it keeps cutting the animation short.
    const now = Date.now();
    const cooldown = 380;
    if (now - lastMoveRef.current < cooldown) return;

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
    lastMoveRef.current = now;

    // After the user stops chasing, ease the button back to center.
    if (recenterTimerRef.current) clearTimeout(recenterTimerRef.current);
    recenterTimerRef.current = setTimeout(() => {
      posRef.current = centerRef.current;
      setPos(centerRef.current);
    }, 2200);

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
        style={{ position: 'fixed', left: pos.x, top: pos.y, pointerEvents: 'none', zIndex: 50, transition: 'left 0.7s cubic-bezier(0.16, 1, 0.3, 1), top 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <button
          ref={buttonRef}
          style={{ pointerEvents: 'auto' }}
          className="px-8 py-4 bg-om-gold text-om-forest-deep font-bold text-lg rounded-lg shadow-xl relative select-none whitespace-nowrap"
        >
          Book a Call
        </button>

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
              <span className="block px-2.5 py-1 bg-om-gold/90 text-black text-xs font-bold rounded-full whitespace-nowrap shadow-md">
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

export function Quiz({ onBackClick }: QuizProps) {
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
        {/* Heading + slots text — above the button, stays still */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10 pointer-events-none pb-[20vh]">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-om-forest-deep leading-tight">
            Cook the Competition
          </h1>
          <p className="mt-5 text-base md:text-xl text-om-mahogany max-w-xl mx-auto leading-relaxed" style={{ fontFamily: "'EB Garamond', serif" }}>
            We make sure your leads don't go to your competition. Or we'll help your competition. Choose wisely.
          </p>
        </div>

        {/* Full-screen dodging button overlay */}
        <DodgingButton />

        {/* Slots text — sits just under the button's starting position */}
        <div className="absolute bottom-[38vh] left-0 right-0 text-center z-10 pointer-events-none">
          <p className="text-sm font-bold tracking-wide text-black">
            1/3 slots available
          </p>
        </div>

        {/* Bottom actions */}
        <div className="absolute bottom-[22vh] left-0 right-0 p-6 text-center z-10">
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
          Quiz · Step {step + 1} of {QUIZ_STEPS.length}
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
