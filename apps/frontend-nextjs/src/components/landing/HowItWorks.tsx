import React from "react";
import Link from "next/link";
import {
  MousePointerClick,
  UserCircle,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    id: 1,
    icon: MousePointerClick,
    title: "Join a Room",
    text: "Click a link to enter your team office directly in the browser.",
    color: "bg-indigo-100",
    iconColor: "text-indigo-600",
    accent: "bg-indigo-500",
  },
  {
    id: 2,
    icon: UserCircle,
    title: "Choose Character",
    text: "Customize your pixel avatar. Be a human, robot, or cat.",
    color: "bg-amber-100",
    iconColor: "text-amber-600",
    accent: "bg-amber-500",
  },
  {
    id: 3,
    icon: MessageCircle,
    title: "Start Talking",
    text: "Walk close to anyone to hear them. Walk away to disconnect.",
    color: "bg-green-100",
    iconColor: "text-green-600",
    accent: "bg-green-500",
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-8">
      <div className="flex flex-col gap-8">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="font-pixel text-4xl text-gray-800 bg-white inline-block px-4 py-2 rounded-lg border-2 border-ui-border shadow-retro-sm">
            How it works
          </h2>
        </div>

        {/* Steps Container */}
        <div className="relative">
          {/* Connection Line - Desktop Only */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-300 via-amber-300 to-green-300 -translate-y-1/2 rounded-full opacity-60"></div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {steps.map((step, index) => (
              <div key={step.id} className="group relative">
                {/* Background Card Effect */}
                <div className="absolute inset-0 bg-ui-border rounded-2xl translate-x-1 translate-y-1 md:translate-x-2 md:translate-y-2 transition-transform group-hover:translate-x-2 group-hover:translate-y-2 md:group-hover:translate-x-3 md:group-hover:translate-y-3"></div>

                {/* Main Card */}
                <div className="relative bg-white border-2 border-ui-border rounded-2xl p-4 md:p-6 hover:-translate-y-1 transition-all h-full flex flex-row md:flex-col items-center gap-4 md:gap-0">
                  {/* Step Number Badge */}
                  <div
                    className={`absolute -top-2 -left-2 md:-top-3 md:-left-3 w-8 h-8 md:w-10 md:h-10 ${step.accent} text-white font-pixel text-lg md:text-xl flex items-center justify-center rounded-lg border-2 border-ui-border shadow-retro-sm z-10`}
                  >
                    {step.id}
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-12 h-12 md:w-16 md:h-16 ${step.color} rounded-xl border-2 border-ui-border flex items-center justify-center shrink-0 md:mb-4 md:mx-auto`}
                  >
                    <step.icon
                      className={`w-6 h-6 md:w-8 md:h-8 ${step.iconColor}`}
                    />
                  </div>

                  {/* Content */}
                  <div className="text-left md:text-center flex-1">
                    <h3 className="font-pixel text-xl md:text-2xl text-gray-900 mb-1 md:mb-2">
                      {step.title}
                    </h3>
                    <p className="font-body text-sm md:text-base text-gray-600 leading-relaxed">
                      {step.text}
                    </p>
                  </div>

                  {/* Arrow to next step - Desktop Only */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-ui-border rounded-full items-center justify-center z-20 shadow-sm">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  )}

                  {/* Pixel Corner decoration */}
                  <div className="hidden md:flex absolute bottom-3 right-3 gap-1">
                    <div className="w-1.5 h-1.5 bg-ui-border rounded-full opacity-20"></div>
                    <div className="w-1.5 h-1.5 bg-ui-border rounded-full opacity-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative mt-8">
          {/* Background Card Effect */}
          <div className="absolute inset-0 bg-ui-border rounded-2xl translate-x-2 translate-y-2"></div>

          {/* Main Card */}
          <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-ui-border rounded-2xl p-8 text-center">
            <p className="font-body text-gray-700 text-lg mb-6 max-w-md mx-auto">
              Ready to bring your team together in a fun, interactive space?
            </p>

            <Link
              href="/rooms"
              className="inline-flex items-center gap-2 bg-brand-secondary hover:bg-rose-500 text-white font-pixel text-2xl px-10 py-4 rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all"
            >
              Get Started Free <ArrowRight className="w-6 h-6" />
            </Link>

            <p className="mt-4 font-pixel text-sm text-gray-500">
              No credit card required • Instant access
            </p>

            {/* Decorative elements */}
            <div className="absolute top-4 left-4 w-3 h-3 bg-brand-primary rounded-full opacity-40"></div>
            <div className="absolute top-8 left-8 w-2 h-2 bg-brand-secondary rounded-full opacity-40"></div>
            <div className="absolute bottom-4 right-4 w-3 h-3 bg-brand-accent rounded-full opacity-40"></div>
            <div className="absolute bottom-8 right-8 w-2 h-2 bg-brand-primary rounded-full opacity-40"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
