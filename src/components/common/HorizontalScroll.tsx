"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
  itemWidth?: number;
}

export default function HorizontalScroll({ 
  children, 
  className = "", 
  itemWidth = 200 
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  // Check scroll when children change (e.g., dynamic content)
  useEffect(() => {
    checkScroll();
  }, [children]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = Math.max(itemWidth * 2, clientWidth * 0.75);
      
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      
      // Update check after animation completes approximately
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <div className="relative group/scroll">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-12 rounded cursor-pointer bg-[#f49e0b] text-black flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:opacity-90 focus:opacity-100 backdrop-blur-sm shadow-md ml-2 border border-white/10"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={`flex overflow-x-auto hide-scrollbar ${className}`}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-[80%] z-10 w-8 h-12 rounded cursor-pointer bg-[#f49e0b] text-black flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:opacity-90 focus:opacity-100 backdrop-blur-sm shadow-md mr-2 border border-white/10"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
