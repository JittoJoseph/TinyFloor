import React from "react";
import { Video, Mic, Map, Smile, Lock } from "lucide-react";

const featureList = [
  {
    icon: Video,
    title: "Proximity Video",
    desc: "Walk up to anyone to start a video call instantly. No links needed.",
    color: "bg-blue-100",
    border: "border-blue-200",
    iconColor: "text-blue-600",
  },
  {
    icon: Map,
    title: "Custom Maps",
    desc: "Design your dream office. Add desks, plants, and coffee bars.",
    color: "bg-amber-100",
    border: "border-amber-200",
    iconColor: "text-amber-700",
  },
  {
    icon: Smile,
    title: "Cute Avatars",
    desc: "Express yourself with hundreds of pixel-art outfits and styles.",
    color: "bg-purple-100",
    border: "border-purple-200",
    iconColor: "text-purple-600",
  },
  {
    icon: Lock,
    title: "Private Rooms",
    desc: "Step into a meeting room and shut the door for sensitive talks.",
    color: "bg-red-100",
    border: "border-red-200",
    iconColor: "text-red-600",
  },
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-8">
      <div className="flex flex-col gap-6">
        <div className="text-center mb-4">
          <h2 className="font-pixel text-4xl text-gray-800 bg-white inline-block px-4 py-2 rounded-lg border-2 border-ui-border shadow-retro-sm">
            Everything you need
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {featureList.map((f, i) => (
            <div key={i} className="group relative">
              {/* Background Card Effect */}
              <div className="absolute inset-0 bg-ui-border rounded-xl translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></div>

              {/* Main Card */}
              <div className="relative bg-white border-2 border-ui-border rounded-xl p-6 flex flex-col md:flex-row gap-4 items-start md:items-center hover:-translate-y-1 transition-transform cursor-default h-full">
                {/* Icon Box */}
                <div
                  className={`w-14 h-14 rounded-lg border-2 border-ui-border flex items-center justify-center shrink-0 shadow-sm ${f.color}`}
                >
                  <f.icon className={`w-7 h-7 ${f.iconColor}`} />
                </div>

                <div>
                  <h3 className="font-pixel text-2xl text-gray-900 mb-1">
                    {f.title}
                  </h3>
                  <p className="font-body text-gray-600 leading-snug">
                    {f.desc}
                  </p>
                </div>

                {/* Pixel Corner decoration */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-ui-border rounded-full opacity-20"></div>
                  <div className="w-1.5 h-1.5 bg-ui-border rounded-full opacity-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
