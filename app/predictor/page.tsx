"use client";

import { useState } from "react";
import { Zap, MapPin, Navigation, Battery, Activity } from "lucide-react";
import { runMLPredictionAction } from "@/app/actions";

export default function MLPredictorTest() {
    const [battery, setBattery] = useState("");
    const [start, setStart] = useState("");
    const [destination, setDestination] = useState("");
    const [sleep, setSleep] = useState("");
    const [fatigue, setFatigue] = useState("low");
    const [result, setResult] = useState<{distance: number, prediction: any} | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handlePredict = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            const res = await runMLPredictionAction(Number(battery), start, destination, Number(sleep), fatigue);

            if (res.error) {
                throw new Error(res.error);
            }

            setResult({ distance: res.distance || 0, prediction: res.prediction });
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center justify-center">
            <div className="glass-panel p-8 rounded-3xl shadow-2xl max-w-xl w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                
                <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                    <Zap className="text-blue-500 w-8 h-8" />
                    EV Range Predictor
                </h2>

                <form onSubmit={handlePredict} className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-foreground/60 uppercase tracking-wide mb-1 block">Battery %</label>
                        <input
                            type="number"
                            required
                            placeholder="e.g. 80"
                            value={battery}
                            onChange={(e) => setBattery(e.target.value)}
                            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-foreground/60 uppercase tracking-wide mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Start Location</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Toronto"
                                value={start}
                                onChange={(e) => setStart(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-foreground/60 uppercase tracking-wide mb-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-purple-500"/> Destination</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Ottawa"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-foreground/60 uppercase tracking-wide mb-1 block">Sleep Hours</label>
                            <input
                                type="number"
                                required
                                placeholder="e.g. 7"
                                value={sleep}
                                onChange={(e) => setSleep(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-foreground/60 uppercase tracking-wide mb-1 block">Fatigue Level</label>
                            <select
                                value={fatigue}
                                onChange={(e) => setFatigue(e.target.value)}
                                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none"
                            >
                                <option value="low">Low Fatigue</option>
                                <option value="medium">Medium Fatigue</option>
                                <option value="high">High Fatigue</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-md font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50 mt-4"
                    >
                        {loading ? "Connecting to Backend..." : "Predict with ML Backend"}
                    </button>
                </form>

                {error && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 font-medium">
                        Error: {error}
                    </div>
                )}

                {result && (
                    <div className="mt-8 p-6 bg-secondary/50 rounded-2xl border border-border">
                        <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><Activity className="text-emerald-500 h-6 w-6" /> ML Prediction Result</h3>
                        <div className="space-y-2">
                            <p className="flex justify-between items-center"><span className="text-foreground/60 font-semibold">📍 Total Distance:</span> <span className="font-bold text-lg">{Number(result.distance || 0).toFixed(2)} km</span></p>
                            
                            {result.prediction && typeof result.prediction === 'object' ? (
                                <>
                                    <p className="flex justify-between items-center"><span className="text-foreground/60 font-semibold">🔋 Estimated Range:</span> <span className="font-bold text-lg text-blue-500">{Number(result.prediction.estimated_range || 0).toFixed(2)} km</span></p>
                                    <p className="flex justify-between items-center"><span className="text-foreground/60 font-semibold">🔌 Recommended Stops:</span> <span className="font-bold text-lg">{String(result.prediction.stops || 0)}</span></p>
                                    <p className="flex justify-between items-center"><span className="text-foreground/60 font-semibold">🩺 Health Advice:</span> <span className="text-sm font-medium text-purple-500 text-right w-1/2">{typeof result.prediction.health_advice === 'string' ? result.prediction.health_advice : JSON.stringify(result.prediction.health_advice)}</span></p>
                                    {result.prediction.status && (
                                        <p className="flex justify-between items-center"><span className="text-foreground/60 font-semibold">📊 Status:</span> <span className="font-bold text-sm text-foreground/80">{String(result.prediction.status)}</span></p>
                                    )}
                                </>
                            ) : (
                                <p className="flex justify-between items-center"><span className="text-foreground/60 font-semibold">🧠 ML Prediction:</span> <span className="font-bold text-lg text-blue-500">{String(result.prediction)}</span></p>
                            )}
                        </div>
                        {(() => {
                            if (!result.prediction) return null;
                            let needsCharge = false;
                            if (typeof result.prediction === 'number') {
                                needsCharge = result.prediction < result.distance;
                            } else if (typeof result.prediction === 'object') {
                                needsCharge = Number(result.prediction.estimated_range) < result.distance || result.prediction.charging_required === true;
                            }
                            
                            if (needsCharge) {
                                return (
                                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 font-bold flex items-center gap-2 text-sm justify-center">
                                        ⚠️ Charging Required
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                )}
            </div>
            <p className="mt-8 text-foreground/40 font-medium max-w-lg text-center text-sm">
                This ML Predictor now runs entirely natively inside Next.js via Server Actions! The external backend is no longer required.
            </p>
        </div>
    );
}
