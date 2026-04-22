'use client'

import Link from "next/link";
import { ArrowRight, MapPin, Zap, ShieldCheck, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { logoutAction } from "./actions";

export default function HomeClient({ user }: { user: any }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl w-full mx-auto"
      >
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <Zap className="h-6 w-6 text-blue-500" />
          </div>
          <span className="text-xl font-bold tracking-tight">OptiRange</span>
        </Link>
        <div className="flex items-center gap-6">
          {user ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm font-bold flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-3 rounded-xl transition-all shadow-lg text-center"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </form>
          ) : (
            <Link
              href="/register"
              className="text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              Get Started
            </Link>
          )}
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-16 px-6 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-blue-500 text-sm font-bold mb-8 shadow-sm"
        >
          <Zap className="h-4 w-4" />
          <span>Smart EV Routing is here</span>
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-7xl font-black tracking-tight max-w-4xl leading-[1.1] mb-6"
        >
          Optimize your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">EV Journey</span> with precision.
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl text-foreground/60 max-w-2xl mb-10 leading-relaxed font-medium"
        >
          Plan long trips with confidence. OptiRange calculates the perfect route matching your vehicle's exact range to optimal fast-charging stations.
        </motion.p>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/trip-planner"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold px-8 py-4 rounded-xl transition-all shadow-xl shadow-blue-500/20 group"
          >
            Plan a Trip Now
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 glass-panel hover:bg-secondary/50 text-foreground text-lg font-bold px-8 py-4 rounded-xl transition-all"
          >
            Go to Dashboard
          </Link>
        </motion.div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto text-left">
          {[
            {
              icon: <MapPin className="h-6 w-6 text-blue-500" />,
              title: "Smart Routing",
              desc: "Discover the most efficient routes dynamically adjusted for elevation and weather.",
              color: "blue"
            },
            {
              icon: <Zap className="h-6 w-6 text-emerald-500" />,
              title: "Charging Integration",
              desc: "Seamlessly locate available fast chargers along your exact pathway.",
              color: "emerald"
            },
            {
              icon: <ShieldCheck className="h-6 w-6 text-purple-500" />,
              title: "Range Assurance",
              desc: "Never worry about range anxiety with real-time accurate battery estimates.",
              color: "purple"
            }
          ].map((feature, i) => (
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + (i * 0.1) }}
              key={i} 
              className="glass-panel p-8 rounded-3xl hover:translate-y-[-5px] transition-transform duration-300 shadow-xl"
            >
              <div className={`h-14 w-14 rounded-2xl bg-${feature.color}-500/10 border border-${feature.color}-500/20 flex items-center justify-center mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-foreground/60 font-medium">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
