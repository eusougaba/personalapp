// Questionário de anamnese respondido pelo aluno no primeiro acesso.
// Triagem de saúde (sim/não) + hábitos e objetivos. Texto próprio, inspirado nas
// triagens de prontidão para atividade física usadas por profissionais de Educação Física.

export type Question =
  | { id: string; type: "yesno"; label: string; risk?: boolean; detail?: string }
  | { id: string; type: "select"; label: string; options: string[] }
  | { id: string; type: "multi"; label: string; options: string[] }
  | { id: string; type: "text"; label: string; placeholder?: string; optional?: boolean }
  | { id: string; type: "textarea"; label: string; placeholder?: string; optional?: boolean };

export type Section = { title: string; text?: string; questions: Question[] };

export const ANAMNESE: Section[] = [
  {
    title: "Sua saúde",
    text: "Responda com sinceridade. As respostas ajudam seu personal a montar um treino seguro para você.",
    questions: [
      { id: "coracao", type: "yesno", risk: true, label: "Algum médico já disse que você tem problema no coração ou pressão alta?" },
      { id: "dor_peito", type: "yesno", risk: true, label: "Você sente dor no peito em repouso ou durante esforço físico?" },
      { id: "tontura", type: "yesno", risk: true, label: "Nos últimos 12 meses você perdeu o equilíbrio por tontura ou desmaiou?" },
      { id: "osteo", type: "yesno", risk: true, label: "Tem algum problema nos ossos, articulações ou músculos que possa piorar com exercício?", detail: "Onde? (ex.: joelho, lombar, ombro)" },
      { id: "cronica", type: "yesno", risk: true, label: "Tem alguma condição crônica (diabetes, asma, problema na tireoide, outra)?", detail: "Qual?" },
      { id: "remedio", type: "yesno", risk: true, label: "Toma algum medicamento de uso contínuo?", detail: "Quais?" },
      { id: "cirurgia", type: "yesno", risk: true, label: "Fez alguma cirurgia nos últimos 12 meses?", detail: "Qual e quando?" },
      { id: "gestacao", type: "yesno", risk: true, label: "Está gestante ou teve bebê nos últimos 6 meses?" },
    ],
  },
  {
    title: "Seus hábitos",
    questions: [
      { id: "atividade", type: "select", label: "Com que frequência você faz atividade física hoje?", options: ["Não faço", "1 a 2 vezes por semana", "3 a 4 vezes por semana", "5 ou mais vezes por semana"] },
      { id: "experiencia", type: "select", label: "Qual sua experiência com musculação?", options: ["Nunca treinei", "Menos de 6 meses", "De 6 meses a 2 anos", "Mais de 2 anos"] },
      { id: "sono", type: "select", label: "Quantas horas você costuma dormir por noite?", options: ["Menos de 5 horas", "5 a 6 horas", "7 a 8 horas", "Mais de 8 horas"] },
      { id: "fuma", type: "select", label: "Você fuma?", options: ["Não", "Sim", "Parei de fumar"] },
      { id: "alcool", type: "select", label: "Consome bebida alcoólica?", options: ["Não", "Socialmente", "Toda semana"] },
    ],
  },
  {
    title: "Seus objetivos",
    questions: [
      { id: "objetivos", type: "multi", label: "O que você quer alcançar? (pode marcar mais de um)", options: ["Emagrecer", "Ganhar massa muscular", "Condicionamento físico", "Saúde e qualidade de vida", "Melhorar postura e dores", "Performance esportiva", "Reabilitação"] },
      { id: "dias", type: "select", label: "Quantos dias por semana você pode treinar?", options: ["1", "2", "3", "4", "5", "6"] },
      { id: "horarios", type: "multi", label: "Melhores horários para treinar", options: ["Manhã cedo", "Manhã", "Almoço", "Tarde", "Noite"] },
      { id: "observacoes", type: "textarea", label: "Algo mais que seu personal deveria saber?", optional: true, placeholder: "Restrições, preferências, exercícios que você não gosta…" },
    ],
  },
  {
    title: "Contato de emergência",
    questions: [
      { id: "emergencia_nome", type: "text", label: "Nome", placeholder: "Quem devemos avisar em caso de emergência" },
      { id: "emergencia_tel", type: "text", label: "Telefone", placeholder: "(11) 99999-9999" },
    ],
  },
];

export const ALL_QUESTIONS = ANAMNESE.flatMap((s) => s.questions);

export function parseAnamnese(form: FormData) {
  const answers: Record<string, string | string[] | boolean | null> = {};
  const missing: string[] = [];
  let hasRisk = false;
  for (const q of ALL_QUESTIONS) {
    if (q.type === "yesno") {
      const v = form.get(q.id);
      if (v !== "sim" && v !== "nao") missing.push(q.label);
      answers[q.id] = v === "sim";
      if (v === "sim" && q.risk) hasRisk = true;
      const d = String(form.get(`${q.id}_detalhe`) ?? "").trim();
      if (d) answers[`${q.id}_detalhe`] = d.slice(0, 500);
    } else if (q.type === "multi") {
      const v = form.getAll(q.id).map(String).filter((x) => q.options.includes(x));
      if (!v.length) missing.push(q.label);
      answers[q.id] = v;
    } else if (q.type === "select") {
      const v = String(form.get(q.id) ?? "");
      if (!q.options.includes(v)) missing.push(q.label);
      answers[q.id] = v || null;
    } else {
      const v = String(form.get(q.id) ?? "").trim().slice(0, 1000);
      if (!v && !q.optional) missing.push(q.label);
      answers[q.id] = v || null;
    }
  }
  return { answers, missing, hasRisk };
}
