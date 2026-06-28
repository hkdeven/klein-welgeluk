"use client";

import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { usePages } from "@/hooks/usePages";

const mockUser = {
  id: "1",
  display_name: "Deven Blackburn",
  short_name: "Deven",
  role: "owner",
  avatar_url: null,
};

export default function HomePage() {
  const { pages, loading } = usePages();
  const [editMode, setEditMode] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const carouselImages = [
    "https://via.placeholder.com/1180x400?text=Klein+Welgeluk",
  ];

  const prevSlide = () => {
    setCarouselIndex(
      (prev) => (prev - 1 + carouselImages.length) % carouselImages.length
    );
  };

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
  };

  // Flatten pages for display
  const allPages = pages
    .flatMap((parent) => parent.children || [])
    .filter((p) => p);

  if (loading) {
    return (
      <div className="shell">
        <Sidebar pages={pages} user={mockUser} editMode={editMode} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sage">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <Sidebar
        pages={pages}
        user={mockUser}
        editMode={editMode}
        onEditModeChange={setEditMode}
      />

      <div className="flex-1">
        <main>
          {/* Photo Carousel */}
          <div className="relative w-full h-[400px] overflow-hidden rounded-md mb-7 bg-[#D6DCD3]">
            <div className="flex h-full">
              {carouselImages.map((img, idx) => (
                <div
                  key={idx}
                  className="min-w-full h-full flex items-center justify-center bg-[#C4CCC0] text-sage relative"
                  style={{
                    transform: `translateX(-${carouselIndex * 100}%)`,
                    transition: "transform 0.4s ease",
                  }}
                >
                  <img
                    src={img}
                    alt={`Slide ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {mockUser.role === "owner" && (
              <button className="absolute top-3 right-3 bg-[rgba(47,64,48,0.85)] text-white text-[11px] px-3 py-1 rounded">
                + add photo
              </button>
            )}

            <button
              onClick={prevSlide}
              className="absolute top-1/2 left-3 -translate-y-1/2 w-8 h-8 rounded-full bg-[rgba(47,64,48,0.7)] text-white flex items-center justify-center"
            >
              ‹
            </button>
            <button
              onClick={nextSlide}
              className="absolute top-1/2 right-3 -translate-y-1/2 w-8 h-8 rounded-full bg-[rgba(47,64,48,0.7)] text-white flex items-center justify-center"
            >
              ›
            </button>

            <div className="flex gap-1 absolute bottom-3 left-1/2 -translate-x-1/2">
              {carouselImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === carouselIndex
                      ? "bg-white"
                      : "bg-[rgba(255,255,255,0.45)]"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-[10.5px] text-mist italic mb-5.5">
            Only Deven and Wernardt can add photos here. Click any photo to view
            full size.
          </div>

          {/* Title Block */}
          <div className="title-block">
            <div>
              <h1>Home</h1>
              <div className="text-[12px] text-sage mt-1.5">
                Welcome back, {mockUser.short_name}
              </div>
            </div>
          </div>

          {/* Assigned to me */}
          <div className="mb-8">
            <h2 className="font-fraunces text-[15px] font-medium text-bottle mb-3.5 flex items-center gap-[10px]">
              Assigned to me
              <span className="flex-1 h-px bg-[#E5E1D3]"></span>
            </h2>
            <div className="bg-whitewash p-4 rounded text-center text-sage">
              Nothing assigned to you right now
            </div>
          </div>

          {/* Progress across project */}
          <div className="mb-8">
            <h2 className="font-fraunces text-[15px] font-medium text-bottle mb-3.5 flex items-center gap-[10px]">
              Progress across the project
              <span className="flex-1 h-px bg-[#E5E1D3]"></span>
            </h2>
            {allPages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3.5">
                {allPages.map((page) => (
                  <div
                    key={page.id}
                    className="border border-[#ECE8DC] rounded p-3.5 bg-whitewash"
                  >
                    <div className="font-fraunces text-base text-bottle font-medium mb-1.5">
                      {page.title}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-sage mb-1">
                      <span>Present status:</span>
                      <span className="text-brass font-semibold">Ideation</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-whitewash p-4 rounded text-center text-sage">
                No pages yet
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="mb-8">
            <h2 className="font-fraunces text-[15px] font-medium text-bottle mb-3.5 flex items-center gap-[10px]">
              Recent activity
              <span className="flex-1 h-px bg-[#E5E1D3]"></span>
            </h2>
            <div className="bg-white border border-[#ECE8DC] rounded p-5">
              <ul className="list-none p-0 m-0">
                <li className="border-b border-dashed border-[#ECE8DC] py-2 text-[13px] text-pine">
                  No recent activity yet
                </li>
              </ul>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
