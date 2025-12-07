import React from "react";
import Link from "next/link";

const steps = [
  {
    id: 1,
    title: "Join a Room",
    text: "Click a link to enter your team office directly in the browser.",
  },
  {
    id: 2,
    title: "Choose Character",
    text: "Customize your pixel avatar. Be a human, robot, or cat.",
  },
  {
    id: 3,
    title: "Start Talking",
    text: "Walk close to anyone to hear them. Walk away to disconnect.",
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-8">
      <div className="bg-white/90 backdrop-blur-sm border-2 border-ui-border rounded-2xl p-6 md:p-8 shadow-retro">
        <h2 className="font-pixel text-3xl text-center mb-8">How it works</h2>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute top-0 bottom-0 left-[19px] w-1 bg-gray-300 border-l-2 border-r-2 border-gray-400/30 md:left-1/2 md:-ml-0.5"></div>

          <div className="flex flex-col gap-10">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex flex-col md:flex-row gap-6 relative ${
                  index % 2 !== 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Number Bubble */}
                <div className="absolute left-0 top-0 md:relative md:w-1/2 flex md:justify-end md:items-center">
                  <div
                    className={`w-10 h-10 bg-brand-primary text-white font-pixel text-2xl flex items-center justify-center rounded-lg border-2 border-ui-border shadow-sm z-10 ${
                      index % 2 !== 0 ? "md:order-last" : ""
                    }`}
                  >
                    {step.id}
                  </div>
                </div>

                {/* Content Box */}
                <div className="pl-14 md:pl-0 md:w-1/2">
                  <div
                    className={`bg-gray-50 border-2 border-ui-border rounded-lg p-4 relative ${
                      index % 2 !== 0 ? "md:text-right" : ""
                    }`}
                  >
                    <h3 className="font-pixel text-xl mb-2">{step.title}</h3>
                    <p className="font-body text-sm text-gray-600">
                      {step.text}
                    </p>

                    {/* Connector Line for Desktop */}
                    <div
                      className={`hidden md:block absolute top-1/2 -translate-y-1/2 w-6 h-0.5 bg-gray-400 ${
                        index % 2 !== 0 ? "-right-6" : "-left-6"
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/create-room"
            className="inline-block bg-brand-secondary hover:bg-rose-500 text-white font-pixel text-2xl px-12 py-4 rounded-xl border-2 border-ui-border shadow-retro-lg active:translate-y-1 active:shadow-retro active:bg-rose-600 transition-all"
          >
            Start for Free
          </Link>
          <p className="mt-4 font-pixel text-gray-500">
            No credit card required • Instant access
          </p>
        </div>
      </div>
    </section>
  );
};
