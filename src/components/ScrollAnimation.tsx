import { useEffect } from "react";
import { gsap } from "gsap";

interface ScrollAnimationProps {
  targetIds: string[];
}

export default function ScrollAnimation({ targetIds }: ScrollAnimationProps) {
  useEffect(() => {
    gsap.from(targetIds, {
      opacity: 0,
      x: 20 /* 오른쪽에서 시작 */,
      stagger: 0.25 /* 각 요소 간의 지연 시간 */,
      duration: 0.5,
      ease: "power2.out",
    });
  }, [targetIds]);

  return null;
}

