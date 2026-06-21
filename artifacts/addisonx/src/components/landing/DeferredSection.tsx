import { useEffect, useRef, useState, Suspense, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Applied to the wrapper so in-page anchors (#pricing, #faq, …) resolve
      even before the lazy content has mounted. */
  id?: string;
  className?: string;
  /** Space reserved before the lazy content mounts — keeps the scrollbar /
      anchor offsets roughly stable so popping content doesn't shift layout. */
  minHeight?: number;
  /** How far ahead of the viewport to start loading. Generous by default so
      the chunk is parsed before the user actually scrolls it into view. */
  rootMargin?: string;
};

/**
 * Defers mounting (and therefore the dynamic import / parse) of a below-the-fold
 * section until it approaches the viewport. Combines IntersectionObserver with
 * React.lazy children so the initial Landing bundle stays small.
 *
 * Anchor-aware: if the page is opened with (or navigated to) a hash matching
 * this section's id, it mounts immediately and re-runs the native scroll once
 * the real content exists.
 */
export const DeferredSection = ({
  children,
  id,
  className,
  minHeight = 360,
  rootMargin = "900px",
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;

    // SSR / very old browsers: render immediately rather than never.
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }

    const reveal = () => {
      setShow(true);
      obs.disconnect();
    };

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reveal();
      },
      { rootMargin },
    );
    obs.observe(el);

    // Show right away if the current hash targets this section, then re-run the
    // anchor scroll after the content has had a frame to mount.
    const showIfHashMatches = () => {
      if (id && window.location.hash === `#${id}`) {
        reveal();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => ref.current?.scrollIntoView()),
        );
      }
    };
    showIfHashMatches();
    window.addEventListener("hashchange", showIfHashMatches);

    return () => {
      obs.disconnect();
      window.removeEventListener("hashchange", showIfHashMatches);
    };
  }, [show, rootMargin, id]);

  return (
    <div ref={ref} id={id} className={className} style={show ? undefined : { minHeight }}>
      {show ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
};
