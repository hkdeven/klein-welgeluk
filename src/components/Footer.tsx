"use client";

import { useEffect, useState } from "react";

interface FooterProps {
  fixed?: boolean;
}

export default function Footer({ fixed }: FooterProps) {
  const [weather, setWeather] = useState<{
    temp: number;
    description: string;
  } | null>(null);

  useEffect(() => {
    // Fetch weather from Open-Meteo API for Greyton (-34.0375, 19.5814)
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-34.0375&longitude=19.5814&current=temperature_2m,weather_code"
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.current) {
          const code = data.current.weather_code;
          let description = "Clear";
          if (code === 1 || code === 2) description = "Partly cloudy";
          if (code === 3) description = "Overcast";
          if (code >= 45 && code <= 48) description = "Foggy";
          if (code >= 51 && code <= 67) description = "Rainy";
          if (code >= 71 && code <= 77) description = "Snowy";
          if (code >= 80 && code <= 82) description = "Rainy";
          if (code >= 85 && code <= 86) description = "Snowy";
          if (code >= 80 && code <= 99) description = "Thunderstorm";

          setWeather({
            temp: Math.round(data.current.temperature_2m),
            description,
          });
        }
      })
      .catch(() => {
        // Fallback
        setWeather({ temp: 18, description: "Partly cloudy" });
      });
  }, []);

  const footerClass = fixed
    ? "fixed bottom-0 left-0 right-0"
    : "relative";

  return (
    <footer className={`site-footer ${footerClass} w-full`}>
      <span>© Klein Welgeluk</span>
      <div className="flex gap-[18px] items-center">
        <a
          href="https://www.instagram.com/kleinwelgeluk/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          @kleinwelgeluk
        </a>
        <a
          href="https://docs.google.com/document/d/1Tbbj0Vy6hRY1C-UL3fcqj5OI7t_m4pSNGL0KcAuPKNw/edit?tab=t.0#heading=h.y4z5lhu1vcrx"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          Greyton Resources
        </a>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11.5px]">
        <span>Greyton</span>
        {weather && (
          <>
            <span className="text-[13px] font-medium">{weather.temp}°C</span>
            <span>{weather.description}</span>
          </>
        )}
      </div>
    </footer>
  );
}
