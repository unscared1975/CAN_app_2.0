
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Inscripcion, Asistencia } from '../types';
import { ICONS } from '../constants';

interface GeminiAssistantProps {
  inscripciones: Inscripcion[];
  attendance: Asistencia[];
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ inscripciones, attendance }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Use named parameter for apiKey exclusively from process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const analysisData = `
        Estado de Inscripciones Actuales: ${JSON.stringify(inscripciones.map(i => ({
        nombre: `${i.alumno?.nombre} ${i.alumno?.apellido}`,
        modulo: i.modulo?.nombre,
        clasesRestantes: i.saldoClases,
        estado: i.estado
      })))}
        Resumen de Asistencias Recientes: ${JSON.stringify(attendance.slice(-15))}
      `;

      // Use systemInstruction for defining the persona and behavioral rules
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analiza los siguientes datos y proporciona un resumen ejecutivo: ${analysisData}`,
        config: {
          systemInstruction: "Eres un asistente experto en administración de centros de nivelación académica. Tu tarea es analizar datos de inscripciones y asistencias. Proporciona un resumen ejecutivo breve (máximo 150 palabras) en español que identifique alumnos en riesgo crítico (0 o 1 clases restantes), analice la regularidad de asistencia y ofrezca una recomendación estratégica. El tono debe ser profesional, empático y directo.",
        }
      });

      // Use property .text directly from response
      setInsight(response.text || "No se pudo generar el análisis en este momento.");
    } catch (error) {
      console.error("Gemini Insight Error:", error);
      setInsight("Error al conectar con el asistente inteligente. Por favor, verifique la conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm w-full mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-primary rounded-[1.5rem] shadow-lg shadow-primary/20">
          <ICONS.Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tighter uppercase">Inteligencia Administrativa</h2>
          <p className="text-[10px] font-black text-inactive uppercase tracking-[0.2em]">Powered by Gemini 3 Pro AI Engine</p>
        </div>
      </div>

      {!insight && !loading && (
        <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto font-medium leading-relaxed">
            Obtén una visión panorámica de tu centro. Analizamos saldos de clases, estados de cuenta y patrones de asistencia automáticamente.
          </p>
          <button
            onClick={generateInsights}
            className="bg-primary text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95"
          >
            Generar Diagnóstico Estratégico
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-6 py-10 text-center">
          <div className="flex justify-center items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce"></div>
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce delay-100"></div>
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce delay-200"></div>
          </div>
          <p className="text-[10px] font-black text-inactive uppercase tracking-[0.3em] animate-pulse">Procesando Métricas del Centro...</p>
          <div className="max-w-md mx-auto space-y-3">
            <div className="h-2 bg-slate-100 rounded-full w-full"></div>
            <div className="h-2 bg-slate-100 rounded-full w-5/6 mx-auto"></div>
            <div className="h-2 bg-slate-100 rounded-full w-3/4 mx-auto"></div>
          </div>
        </div>
      )}

      {insight && (
        <div className="animate-in slide-in-from-bottom-6 duration-700">
          <div className="bg-[#F8FAFC] p-8 rounded-[2rem] text-sm text-[#1E293B] leading-relaxed border border-slate-100 relative overflow-hidden shadow-inner">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
            <p className="whitespace-pre-line font-medium italic">{insight}</p>
          </div>
          <div className="mt-8 flex justify-between items-center">
            <p className="text-[9px] font-bold text-inactive uppercase tracking-widest italic">* El análisis se basa en datos actuales del sistema.</p>
            <button
              onClick={() => setInsight(null)}
              className="px-6 py-2 bg-slate-100 text-primary rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-slate-200 transition-colors"
            >
              Nuevo Diagnóstico
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
