"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";
import { BotAvatar } from "bot-avatars";
import { motion, AnimatePresence } from "framer-motion";
import { useAuditStore } from "@/lib/auditStore";
import { useAppTranslation } from "@/lib/i18n";
import { apiClient } from "@/lib/apiClient";

interface UserChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timeString: string;
}

export const AIAssistantChat: React.FC = () => {
  const { auditResult, extractedData } = useAuditStore();
  const { t, activeLanguage } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userMessages, setUserMessages] = useState<UserChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [userMessages, isLoading, isOpen]);

  // Context-aware suggested chips
  const quickChips = auditResult
    ? [
        t("assistant.chipWhyHigh", "Why am I overcharged?"),
        t("assistant.chipFsa", "What tariff slab am I in?"),
        t("assistant.chipFixedCharge", "Can I challenge this bill?"),
        t("assistant.chipReduceUsage", "How can I reduce next month's bill?"),
        t("assistant.chipSlabs", "Explain this audit result."),
      ]
    : [
        t("assistant.chipExplainBill", "What are the APERC domestic tariff slabs?"),
        "How much is the electricity duty in AP?",
        "What is the FPPCA fuel surcharge?",
        "How does CGRF dispute filing work?",
      ];

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || inputValue).trim();
    if (!textToSend || isLoading) return;

    counterRef.current += 1;
    const msgId = `msg-${counterRef.current}`;

    const userMsg: UserChatMessage = {
      id: `usr-${msgId}`,
      sender: "user",
      text: textToSend,
      timeString: "Sent",
    };

    setUserMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInputValue("");
    setIsLoading(true);

    const billContext = auditResult
      ? {
          has_audit: true,
          consumer_name: extractedData?.consumerName || "Consumer",
          service_number: extractedData?.serviceNumber || "—",
          units_consumed: auditResult.unitsConsumed,
          actual_bill: auditResult.actualBill,
          expected_bill: auditResult.expectedBill,
          highest_slab: auditResult.highestSlabApplied,
          difference: auditResult.difference,
          status: auditResult.status,
          discom: auditResult.discom,
        }
      : {
          has_audit: false,
        };

    try {
      const reply = await apiClient.chatAssistant(
        textToSend,
        activeLanguage,
        billContext
      );

      counterRef.current += 1;
      const botMsg: UserChatMessage = {
        id: `bot-${counterRef.current}`,
        sender: "bot",
        text: reply,
        timeString: "Just now",
      };

      setUserMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot request failed:", err);
      const fallbackError = auditResult
        ? `For your ${auditResult.discom} statement (${auditResult.unitsConsumed} units), expected calculation is ₹${auditResult.expectedBill.toFixed(2)} vs actual billed ₹${auditResult.actualBill.toFixed(2)}. You may request an itemized billing explanation from the DISCOM regarding the variance.`
        : "Under APERC regulations, domestic electricity charges follow approved telescopic slabs (0–30 @ ₹1.90, 31–75 @ ₹3.00, 76–125 @ ₹4.50, 126–225 @ ₹6.00, 226–400 @ ₹8.75, 401+ @ ₹9.75). Upload a bill to run an audit.";

      const errorMsg: UserChatMessage = {
        id: `bot-err-${counterRef.current}`,
        sender: "bot",
        text: fallbackError,
        timeString: "Just now",
      };
      setUserMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button strictly positioned at bottom-right */}
      <div className="fixed bottom-6 right-6 z-50 print:hidden pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center gap-2.5 p-1.5 pr-4 rounded-full bg-white hover:bg-slate-50 border border-slate-300 shadow-xl shadow-slate-900/15 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Open AI Electricity Assistant"
        >
          {/* Animated AI Bot Icon */}
          <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center shrink-0 shadow-xs relative overflow-hidden border border-emerald-500/30">
            <BotAvatar type="clover" color="#22C55E" size={40} state={isLoading ? "working" : "default"} />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-[#0F172A] leading-tight flex items-center gap-1">
              <span>{t("assistant.title", "Electricity Assistant")}</span>
              <Sparkles className="w-3 h-3 text-emerald-600" />
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {t("assistant.subtitle", "APERC Grounded AI")}
            </span>
          </div>

          <span className="w-2 h-2 rounded-full bg-[#22C55E] ml-1" />
        </button>
      </div>

      {/* Slide-over Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[84px] right-6 w-[420px] max-w-[calc(100vw-2rem)] max-h-[600px] h-[550px] bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl z-50 flex flex-col overflow-hidden text-left"
          >
            {/* Header: Professional Utility Company style */}
            <div className="p-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-emerald-500/40">
                  <BotAvatar type="clover" color="#22C55E" size={36} state={isLoading ? "working" : "default"} />
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-tight text-white flex items-center gap-1.5">
                    <span>{t("assistant.title", "APERC Electricity Assistant")}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Statutory Consumer Advisory • Andhra Pradesh
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Context Strip */}
            {auditResult && (
              <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-950 font-mono shrink-0">
                <span className="font-bold">{auditResult.discom} • {auditResult.unitsConsumed} Units</span>
                <span>
                  Billed: ₹{auditResult.actualBill} (Diff: {auditResult.difference >= 0 ? "+" : ""}₹{auditResult.difference})
                </span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]/60 text-xs">
              {/* Initial Bot Greeting */}
              <div className="flex items-start gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center shrink-0 mt-0.5">
                  <BotAvatar type="clover" color="#22C55E" size={24} state="default" />
                </div>
                <div className="max-w-[85%] p-3 rounded-xl leading-relaxed whitespace-pre-wrap bg-white text-slate-900 border border-slate-200/80 shadow-2xs">
                  <div className="text-[11px] font-normal">
                    {auditResult
                      ? `I have audited your ${auditResult.discom} statement for ${auditResult.unitsConsumed} units. APERC expected charge is ₹${auditResult.expectedBill}, while actual billed is ₹${auditResult.actualBill} (Variance: ${auditResult.difference >= 0 ? "+" : ""}₹${auditResult.difference}). Ask me anything about your tariff slabs or dispute options.`
                      : t("assistant.greeting", "Hello! I am your APERC electricity assistant. Upload an electricity bill or ask me about tariff slabs, fixed connection charges, and official dispute resolution in Andhra Pradesh.")}
                  </div>
                  <span className="text-[9px] block mt-1.5 text-slate-400 font-mono">
                    APERC Statutory Advisory
                  </span>
                </div>
              </div>

              {/* User and Bot Messages */}
              {userMessages.map((m) => {
                const isBot = m.sender === "bot";
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2 ${
                      isBot ? "justify-start" : "justify-end"
                    }`}
                  >
                    {isBot && (
                      <div className="w-7 h-7 rounded-full bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center shrink-0 mt-0.5">
                        <BotAvatar type="clover" color="#22C55E" size={24} state="default" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-3 rounded-xl leading-relaxed whitespace-pre-wrap shadow-2xs ${
                        isBot
                          ? "bg-white text-slate-900 border border-slate-200/80"
                          : "bg-[#0F172A] text-white"
                      }`}
                    >
                      <div className="text-[11px]">{m.text}</div>
                      <span
                        className={`text-[9px] block mt-1 font-mono ${
                          isBot ? "text-slate-400" : "text-slate-300"
                        }`}
                      >
                        {m.timeString}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-[11px] p-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Consulting APERC regulatory schedules...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Context Chips */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 overflow-x-auto flex gap-1.5 shrink-0 scrollbar-none">
              {quickChips.map((chip, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSend(chip)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-medium shrink-0 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t("assistant.placeholder", "Ask about slabs, charges, overbilling...")}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-900 placeholder:text-slate-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
