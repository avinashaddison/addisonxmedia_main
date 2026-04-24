import { useEffect, useState } from "react";

type Props = {
  phrases: string[];
  typingSpeed?: number;
  pauseMs?: number;
  className?: string;
};

export const TypingText = ({ phrases, typingSpeed = 38, pauseMs = 1800, className }: Props) => {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx % phrases.length];
    if (!deleting && text === current) {
      const t = setTimeout(() => setDeleting(true), pauseMs);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % phrases.length);
      return;
    }
    const t = setTimeout(
      () => {
        setText((prev) =>
          deleting ? current.slice(0, prev.length - 1) : current.slice(0, prev.length + 1)
        );
      },
      deleting ? typingSpeed / 1.6 : typingSpeed
    );
    return () => clearTimeout(t);
  }, [text, deleting, phraseIdx, phrases, typingSpeed, pauseMs]);

  return (
    <span className={className}>
      {text}
      <span className="inline-block w-[2px] h-[0.95em] -mb-[2px] ml-[2px] bg-current align-middle animate-blink" />
    </span>
  );
};
