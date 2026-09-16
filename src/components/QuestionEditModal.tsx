/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QuizQuestion, QuizOption } from '../types';
import { X, CheckCircle2, Plus, Trash2, HelpCircle, AlertCircle } from 'lucide-react';

interface QuestionEditModalProps {
  isOpen: boolean;
  question: QuizQuestion | null;
  onSave: (question: QuizQuestion) => void;
  onClose: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  isOpen,
  question,
  onSave,
  onClose,
}) => {
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<QuizOption[]>([
    { id: 'opt_1', text: '', isCorrect: true },
    { id: 'opt_2', text: '', isCorrect: false },
    { id: 'opt_3', text: '', isCorrect: false },
  ]);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setQuestionText(question.question);
      setOptions(
        question.options.map((o) => ({
          ...o,
        }))
      );
      setExplanation(question.explanation || '');
      setError(null);
    } else {
      // Create new template
      setQuestionText('');
      setOptions([
        { id: `opt_${Date.now()}_1`, text: '', isCorrect: true },
        { id: `opt_${Date.now()}_2`, text: '', isCorrect: false },
        { id: `opt_${Date.now()}_3`, text: '', isCorrect: false },
      ]);
      setExplanation('');
      setError(null);
    }
  }, [question, isOpen]);

  if (!isOpen) return null;

  const handleOptionTextChange = (idx: number, text: string) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], text };
      return updated;
    });
    setError(null);
  };

  const handleSetCorrectOption = (idx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        isCorrect: i === idx,
      }))
    );
    setError(null);
  };

  const handleAddOption = () => {
    if (options.length >= 4) return;
    setOptions((prev) => [
      ...prev,
      {
        id: `opt_${Date.now()}_${prev.length + 1}`,
        text: '',
        isCorrect: false,
      },
    ]);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) {
      setError('Otázka musí mít alespoň 2 možnosti (např. Ano / Ne).');
      return;
    }
    const removedWasCorrect = options[idx].isCorrect;
    const remaining = options.filter((_, i) => i !== idx);

    // If we removed the correct option, default first remaining to correct
    if (removedWasCorrect && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isCorrect: true };
    }

    setOptions(remaining);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion) {
      setError('Zadejte prosím znění otázky.');
      return;
    }

    // Check all options have text
    const emptyOpt = options.find((opt) => !opt.text.trim());
    if (emptyOpt) {
      setError('Všechny možnosti odpovědi musí mít vyplněný text.');
      return;
    }

    // Check exactly one is correct
    const correctCount = options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      setError('Vyberte prosím právě jednu správnou odpověď.');
      return;
    }

    const updatedQuestion: QuizQuestion = {
      id: question ? question.id : `q_${Date.now()}`,
      question: trimmedQuestion,
      options: options.map((opt) => ({
        ...opt,
        text: opt.text.trim(),
      })),
      explanation: explanation.trim() || undefined,
    };

    onSave(updatedQuestion);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#140e0c] border border-[#e5a995]/40 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e5a995]/20 border border-[#e5a995]/40 flex items-center justify-center text-[#e5a995]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-medium text-white">
                {question ? 'Upravit otázku kvízu' : 'Přidat novou otázku'}
              </h3>
              <p className="text-xs text-slate-400">
                Nastavte text otázky, varianty odpovědí a označte správnou.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Question Text */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#f5d5c8] uppercase tracking-wider">
              Znění otázky *
            </label>
            <textarea
              value={questionText}
              onChange={(e) => {
                setQuestionText(e.target.value);
                setError(null);
              }}
              rows={3}
              placeholder="Např. Jaký operační systém používají telefony Google Pixel?"
              className="w-full bg-white/[0.04] border border-white/15 focus:border-[#e5a995] rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e5a995] transition resize-none"
              required
            />
          </div>

          {/* Options Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#f5d5c8] uppercase tracking-wider">
                Možnosti odpovědi (označte správnou) *
              </label>
              {options.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="flex items-center gap-1.5 text-xs text-[#e5a995] hover:text-white hover:underline transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Přidat možnost</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => {
                const letter = OPTION_LETTERS[idx] || `${idx + 1}`;
                return (
                  <div
                    key={opt.id || idx}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                      opt.isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Letter badge */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        opt.isCorrect
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {letter}
                    </div>

                    {/* Option Text Input */}
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Text možnosti ${letter}...`}
                      className="flex-1 bg-transparent border-0 text-sm text-white placeholder-slate-500 focus:outline-none"
                      required
                    />

                    {/* Radio / Correct status toggle button */}
                    <button
                      type="button"
                      onClick={() => handleSetCorrectOption(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 select-none ${
                        opt.isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 ${
                          opt.isCorrect ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <span>{opt.isCorrect ? 'Správná' : 'Označit'}</span>
                    </button>

                    {/* Remove Option Button (only if > 2) */}
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer shrink-0"
                        title="Odstranit možnost"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              Minimálně 2 možnosti (např. Ano / Ne), maximálně 4 možnosti.
            </p>
          </div>

          {/* Explanation / Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#f5d5c8] uppercase tracking-wider">
              Vysvětlení odpovědi / Poznámka (volitelné)
            </label>
            <input
              type="text"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Např. Telefony Pixel běží na čistém Androidu přímo od Googlu."
              className="w-full bg-white/[0.04] border border-white/15 focus:border-[#e5a995] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e5a995] transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/5 transition text-xs font-medium cursor-pointer"
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-[#1c120e] font-semibold text-xs hover:shadow-[0_0_20px_rgba(229,169,149,0.4)] transition cursor-pointer active:scale-95"
            >
              {question ? 'Uložit změny' : 'Přidat otázku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
