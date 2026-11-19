'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SiteContent } from '@/server/site-template';
import {
  applyOperations,
  normalizeSiteModel,
  type SiteOperation,
  type SiteGlobalElements,
  type SiteSectionConfig
} from '@/server/site-operations';
import { renderSiteTemplateV3 } from '@/server/site-template-v3';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sectionsChanged?: string[];
  isStreaming?: boolean;
  clarificationOptions?: string[];
}

interface SiteEditorPanelProps {
  siteId: string;
  slug: string;
  initialContent: SiteContent | any;
  initialHtml: string;
  onClose: () => void;
  onSiteUpdated?: (content: any, html: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'Cabeçalho Principal (Hero)',
  differentials: 'Métricas / Diferenciais',
  about: 'História / Sobre a Empresa',
  services: 'Serviços & Especialidades',
  steps: 'Como Funciona (Passos)',
  gallery: 'Galeria & Instalações',
  reviews: 'Depoimentos dos Clientes',
  wa_form: 'Formulário de WhatsApp',
  faq: 'Perguntas Frequentes',
  location: 'Localização e Contactos'
};

export default function SiteEditorPanel({
  siteId,
  slug,
  initialContent,
  initialHtml,
  onClose,
  onSiteUpdated
}: SiteEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'elements'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Sou o seu assistente de edição em direto.\n\nPode dar-me instruções diretas por conversa como:\n• *"remove o botão de chamada"*\n• *"tira a barra fixa de baixo"*\n• *"muda o texto do botão para Marcar consulta"*\n• *"põe o fundo do hero verde escuro e o texto branco"*\n• *"troca a ordem: avaliações antes de serviços"*\n• *"duplica a secção de serviços e chama-lhe Pacotes"*\n• *"esconde o mapa"*\n\nOu use a aba **Elementos e secções** para controlo visual instantâneo sem custos!`
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentContent, setCurrentContent] = useState<any>(normalizeSiteModel(initialContent));
  const [currentHtml, setCurrentHtml] = useState<string>(initialHtml);
  const [historyStack, setHistoryStack] = useState<Array<{ content: any; html: string }>>([
    { content: normalizeSiteModel(initialContent), html: initialHtml }
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [streamingText, setStreamingText] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);

  // Estados para Revisão Item por Item de Dados de Exemplo
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFormValues, setEditFormValues] = useState<{ title: string; description: string }>({ title: '', description: '' });
  const [confirmAllChecked, setConfirmAllChecked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Atualizar o iframe via srcdoc
  useEffect(() => {
    if (iframeRef.current && currentHtml) {
      iframeRef.current.srcdoc = currentHtml;
    }
  }, [currentHtml]);

  // Validação segura de mensagens postMessage originadas do iframe de prévia
  useEffect(() => {
    const handlePostMessage = (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      if (e.data?.type === 'PROSPECTA_INLINE_EDIT') {
        const { field, value } = e.data;
        if (!field || typeof value !== 'string') return;

        handleApplyDirectOp({
          op: 'set',
          path: field,
          value
        });
      }
    };

    window.addEventListener('message', handlePostMessage);
    return () => window.removeEventListener('message', handlePostMessage);
  }, [currentContent, historyIndex]);

  // Aplicação direta de operações (Sem custo, zero créditos)
  const handleApplyDirectOp = (op: SiteOperation) => {
    const result = applyOperations(currentContent, [op]);
    const nextContent = result.updatedContent;
    const nextHtml = renderSiteTemplateV3(nextContent, true, true);

    setCurrentContent(nextContent);
    setCurrentHtml(nextHtml);

    setHistoryStack(prev => {
      const nextStack = prev.slice(0, historyIndex + 1);
      return [...nextStack, { content: nextContent, html: nextHtml }];
    });
    setHistoryIndex(prev => prev + 1);

    onSiteUpdated?.(nextContent, nextHtml);
  };

  // Confirmação Item por Item de Dados de Exemplo
  const handleConfirmSingleItem = (sectionKey: 'differentials' | 'services' | 'reviews', index: number) => {
    const updated = { ...currentContent };
    if (Array.isArray(updated[sectionKey]) && updated[sectionKey][index]) {
      const list = [...updated[sectionKey]];
      list[index] = { ...list[index], exemplo: false };
      updated[sectionKey] = list;
    }

    const remainingDiffs = (updated.differentials || []).filter((d: any) => d.exemplo === true);
    const remainingServices = (updated.services || []).filter((s: any) => s.exemplo === true);
    const remainingReviews = (updated.reviews || []).filter((r: any) => r.exemplo === true);

    if (remainingDiffs.length === 0 && remainingServices.length === 0 && remainingReviews.length === 0) {
      updated.hasExampleData = false;
      updated.placeholders_pending = 0;
      updated.placeholdersPending = 0;
    }

    const nextHtml = renderSiteTemplateV3(updated, true, true);
    setCurrentContent(updated);
    setCurrentHtml(nextHtml);
    setHistoryStack(prev => [...prev.slice(0, historyIndex + 1), { content: updated, html: nextHtml }]);
    setHistoryIndex(prev => prev + 1);
    onSiteUpdated?.(updated, nextHtml);
  };

  const handleSaveEditItem = (
    sectionKey: 'differentials' | 'services' | 'reviews',
    index: number,
    newTitle: string,
    newDescription: string
  ) => {
    const updated = { ...currentContent };
    if (Array.isArray(updated[sectionKey]) && updated[sectionKey][index]) {
      const list = [...updated[sectionKey]];
      const item = { ...list[index], exemplo: false };
      if (sectionKey === 'differentials') {
        item.title = newTitle;
        item.description = newDescription;
      } else if (sectionKey === 'services') {
        item.title = newTitle;
        item.description = newDescription;
      } else if (sectionKey === 'reviews') {
        item.name = newTitle;
        item.text = newDescription;
        item.comment = newDescription;
      }
      list[index] = item;
      updated[sectionKey] = list;
    }

    const remainingDiffs = (updated.differentials || []).filter((d: any) => d.exemplo === true);
    const remainingServices = (updated.services || []).filter((s: any) => s.exemplo === true);
    const remainingReviews = (updated.reviews || []).filter((r: any) => r.exemplo === true);

    if (remainingDiffs.length === 0 && remainingServices.length === 0 && remainingReviews.length === 0) {
      updated.hasExampleData = false;
      updated.placeholders_pending = 0;
      updated.placeholdersPending = 0;
    }

    const nextHtml = renderSiteTemplateV3(updated, true, true);
    setCurrentContent(updated);
    setCurrentHtml(nextHtml);
    setHistoryStack(prev => [...prev.slice(0, historyIndex + 1), { content: updated, html: nextHtml }]);
    setHistoryIndex(prev => prev + 1);
    onSiteUpdated?.(updated, nextHtml);
    setEditingItemId(null);
  };

  const handleConfirmAll = () => {
    if (!confirmAllChecked) return;
    const updated = {
      ...currentContent,
      hasExampleData: false,
      placeholders_pending: 0,
      placeholdersPending: 0
    };
    if (Array.isArray(updated.differentials)) {
      updated.differentials = updated.differentials.map((d: any) => ({ ...d, exemplo: false }));
    }
    if (Array.isArray(updated.services)) {
      updated.services = updated.services.map((s: any) => ({ ...s, exemplo: false }));
    }
    if (Array.isArray(updated.reviews)) {
      updated.reviews = updated.reviews.map((r: any) => ({ ...r, exemplo: false }));
    }

    const nextHtml = renderSiteTemplateV3(updated, true, true);
    setCurrentContent(updated);
    setCurrentHtml(nextHtml);
    setHistoryStack(prev => [...prev.slice(0, historyIndex + 1), { content: updated, html: nextHtml }]);
    setHistoryIndex(prev => prev + 1);
    onSiteUpdated?.(updated, nextHtml);
    setConfirmAllChecked(false);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isLoading) return;

    setInput('');
    setIsLoading(true);
    setStreamingText('');

    const userMsgId = 'u_' + Date.now();
    const assistantMsgId = 'a_' + Date.now();

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: textToSend },
      { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true }
    ]);

    try {
      const res = await fetch('/api/site/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          message: textToSend,
          currentContent
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Erro de comunicação.' }));
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  isStreaming: false,
                  content: `❌ ${errorData.error || 'Não foi possível processar a alteração.'}`
                }
              : m
          )
        );
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('Canal de transmissão não disponível.');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let partialText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.type === 'chunk') {
              partialText += data.text;
              setStreamingText(partialText);
            } else if (data.type === 'clarification') {
              setStreamingText('');
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        isStreaming: false,
                        content: `❓ **${data.explanation || data.question}**`,
                        clarificationOptions: data.options || []
                      }
                    : m
                )
              );
            } else if (data.type === 'done') {
              setStreamingText('');
              setCurrentContent(data.content);
              setCurrentHtml(data.html);

              if (data.history_saved === false) {
                setHistoryWarning(data.history_warning || '⚠️ Histórico salvo apenas nesta sessão (tabela site_messages pendente de migração).');
              } else {
                setHistoryWarning(null);
              }

              setHistoryStack(prev => {
                const nextStack = prev.slice(0, historyIndex + 1);
                return [...nextStack, { content: data.content, html: data.html }];
              });
              setHistoryIndex(prev => prev + 1);

              const sectionsSummary = data.sections_changed && data.sections_changed.length > 0
                ? `\n\n🎯 **Secções ajustadas:** ${data.sections_changed.map((s: string) => SECTION_LABELS[s] || s).join(', ')}`
                : '';

              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        isStreaming: false,
                        content: `✨ ${data.explanation || 'Alteração concluída com sucesso.'}${sectionsSummary}`,
                        sectionsChanged: data.sections_changed
                      }
                    : m
                )
              );

              onSiteUpdated?.(data.content, data.html);
            } else if (data.type === 'error') {
              setStreamingText('');
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        isStreaming: false,
                        content: `⚠️ ${data.error || 'Houve uma falha ao aplicar a alteração.'}`
                      }
                    : m
                )
              );
            }
          } catch {
            // Ignora JSON parcial
          }
        }
      }
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                isStreaming: false,
                content: `❌ Erro de rede: ${err.message || 'Falha ao conectar.'}`
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingText('');
      textareaRef.current?.focus();
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      const prev = historyStack[newIdx];
      setCurrentContent(prev.content);
      setCurrentHtml(prev.html);
      onSiteUpdated?.(prev.content, prev.html);
      setMessages(m => [...m, { id: 'sys_' + Date.now(), role: 'assistant', content: '↩️ Alteração revertida com sucesso.' }]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      const next = historyStack[newIdx];
      setCurrentContent(next.content);
      setCurrentHtml(next.html);
      onSiteUpdated?.(next.content, next.html);
      setMessages(m => [...m, { id: 'sys_' + Date.now(), role: 'assistant', content: '↪️ Alteração restaurada com sucesso.' }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const global = currentContent.global || {};
  const sectionsOrder: string[] = currentContent.sectionsOrder || [];

  // Itens de Exemplo Pendentes para Revisão Item por Item
  const pendingExampleItems: Array<{
    id: string;
    sectionKey: 'differentials' | 'services' | 'reviews';
    locationLabel: string;
    index: number;
    title: string;
    description: string;
  }> = [];

  if (Array.isArray(currentContent.differentials)) {
    currentContent.differentials.forEach((d: any, index: number) => {
      if (d.exemplo === true || (currentContent.hasExampleData && d.exemplo !== false)) {
        pendingExampleItems.push({
          id: `diff-${index}`,
          sectionKey: 'differentials',
          locationLabel: 'Secção: Diferenciais',
          index,
          title: d.title || d.label || d.metric || `Diferencial ${index + 1}`,
          description: d.description || d.value || ''
        });
      }
    });
  }

  if (Array.isArray(currentContent.services)) {
    currentContent.services.forEach((s: any, index: number) => {
      if (s.exemplo === true) {
        pendingExampleItems.push({
          id: `srv-${index}`,
          sectionKey: 'services',
          locationLabel: 'Secção: Serviços & Especialidades',
          index,
          title: s.title || `Serviço ${index + 1}`,
          description: s.description || ''
        });
      }
    });
  }

  if (Array.isArray(currentContent.reviews)) {
    currentContent.reviews.forEach((r: any, index: number) => {
      if (r.exemplo === true) {
        pendingExampleItems.push({
          id: `rev-${index}`,
          sectionKey: 'reviews',
          locationLabel: 'Secção: Avaliações',
          index,
          title: r.name || `Avaliação ${index + 1}`,
          description: r.text || r.comment || ''
        });
      }
    });
  }

  const hasPendingExampleData = Boolean(
    (currentContent.placeholders_pending || 0) > 0 ||
    (currentContent.placeholdersPending || 0) > 0 ||
    currentContent.hasExampleData ||
    pendingExampleItems.length > 0
  );

  if (hasPendingExampleData && pendingExampleItems.length === 0) {
    pendingExampleItems.push({
      id: 'gen-0',
      sectionKey: 'differentials',
      locationLabel: 'Apresentação da Empresa',
      index: 0,
      title: currentContent.businessName || 'Dados de Contacto e Apresentação',
      description: 'Valide as informações gerais geradas como rascunho.'
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-slate-100 font-sans">
      {/* PAINEL ESQUERDO: CHAT IA / ELEMENTOS E SECÇÕES */}
      <div className="w-full md:w-[420px] lg:w-[480px] flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur">
        {/* Cabeçalho do Editor */}
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base flex-shrink-0">
              ✨
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                Editar com IA
                <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full font-bold">
                  Em direto
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                {currentContent.businessName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0 || isLoading}
              className="text-xs text-slate-300 hover:text-white bg-slate-800 disabled:opacity-30 border border-slate-700 px-2.5 py-1.5 rounded-lg transition min-h-[32px] flex items-center gap-1"
              title="Desfazer última alteração"
            >
              ↩ Desfazer
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= historyStack.length - 1 || isLoading}
              className="text-xs text-slate-300 hover:text-white bg-slate-800 disabled:opacity-30 border border-slate-700 px-2 py-1.5 rounded-lg transition min-h-[32px] flex items-center justify-center"
              title="Refazer alteração"
            >
              ↪
            </button>
            <a
              href={`/s/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg transition min-h-[32px] flex items-center justify-center"
              title="Abrir página pública"
            >
              ↗
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition min-h-[32px] min-w-[32px] flex items-center justify-center"
              title="Fechar editor"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Abas Superiores: Chat IA vs Elementos e secções */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>💬</span>
            <span>Editar com IA</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('elements')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
              activeTab === 'elements'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🧩</span>
            <span>Elementos e secções</span>
          </button>
        </div>

        {/* Aviso Discreto de Migração Pendente para Histórico */}
        {historyWarning && (
          <div className="bg-amber-500/10 border-b border-amber-500/25 px-3.5 py-1.5 text-[11px] text-amber-300 flex items-center justify-between">
            <span className="truncate pr-2">{historyWarning}</span>
            <span className="text-[9px] bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
              Sessão Local
            </span>
          </div>
        )}

        {/* CONTEÚDO DA ABA CHAT */}
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-sm'
                    }`}
                  >
                    {msg.isStreaming && streamingText ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                          A traduzir para operações em tempo real...
                        </div>
                        <div className="text-xs font-mono text-slate-400 line-clamp-3 bg-slate-900/60 p-2 rounded border border-slate-800">
                          {streamingText}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="whitespace-pre-line">{msg.content}</div>
                        {msg.clarificationOptions && msg.clarificationOptions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {msg.clarificationOptions.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleSendMessage(opt)}
                                className="text-xs bg-blue-600/30 hover:bg-blue-600 text-blue-200 border border-blue-500/40 px-2.5 py-1 rounded-lg transition"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Atalhos Rápidos e Campo de Input */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-900/60 space-y-2.5">
              <div className="flex gap-1.5 flex-wrap">
                {[
                  'remove o botão de chamada',
                  'tira a barra fixa de baixo',
                  'muda o texto do botão para Marcar consulta',
                  'esconde o mapa'
                ].map(sugg => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => handleSendMessage(sugg)}
                    disabled={isLoading}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full transition disabled:opacity-50"
                  >
                    + {sugg}
                  </button>
                ))}
              </div>

              <div className="relative flex items-end gap-2 bg-slate-950 border border-slate-750 focus-within:border-blue-500 rounded-xl p-2 transition">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  rows={2}
                  placeholder="Diga à IA o que alterar (ex: 'remove o botão de chamada')..."
                  className="w-full bg-transparent resize-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50 px-1"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="h-8 w-8 flex-shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center font-bold transition shadow-sm"
                  title="Enviar instrução"
                >
                  {isLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    '↑'
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                <span>Pressione Enter para enviar</span>
                <span>1 crédito por ajuste assistido</span>
              </div>
            </div>
          </div>
        ) : (
          /* CONTEÚDO DA ABA ELEMENTOS E SECÇÕES (CONTROLO DIRETO SEM CUSTO) */
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
            {/* Confirmação Segura de Dados Reais: Revisão Item por Item */}
            {hasPendingExampleData && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-500/20">
                  <span className="text-amber-300 font-semibold text-xs flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Dados de exemplo a confirmar</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold whitespace-nowrap">
                    {pendingExampleItems.length} pendente{pendingExampleItems.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Para garantir que o site representa fielmente o seu negócio, reveja ou edite cada item individualmente antes da aprovação final:
                </p>

                {/* Lista Item por Item */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {pendingExampleItems.map(item => (
                    <div key={item.id} className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-3 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2 text-[10px] text-amber-400 font-medium">
                        <span className="truncate">📍 {item.locationLabel}</span>
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider flex-shrink-0">
                          Exemplo
                        </span>
                      </div>

                      {editingItemId === item.id ? (
                        /* Modo Edição Inline */
                        <div className="space-y-2.5 pt-1 border-t border-slate-800">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1 font-medium">Título / Métrica</label>
                            <input
                              type="text"
                              value={editFormValues.title}
                              onChange={e => setEditFormValues(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1 font-medium">Descrição</label>
                            <textarea
                              value={editFormValues.description}
                              onChange={e => setEditFormValues(prev => ({ ...prev, description: e.target.value }))}
                              rows={2}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none leading-relaxed"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition min-h-[32px]"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditItem(item.sectionKey, item.index, editFormValues.title, editFormValues.description)}
                              className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition min-h-[32px] shadow-sm"
                            >
                              Salvar e Confirmar
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Modo Visualização do Item */
                        <div>
                          <div className="text-xs font-semibold text-slate-100">{item.title}</div>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                          )}
                          <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditFormValues({ title: item.title, description: item.description });
                              }}
                              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 rounded-lg transition flex items-center gap-1.5 min-h-[32px]"
                            >
                              <span>✏️</span>
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmSingleItem(item.sectionKey, item.index)}
                              className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-medium rounded-lg transition flex items-center gap-1.5 min-h-[32px] shadow-sm"
                            >
                              <span>✓</span>
                              <span>Confirmar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Opção Confirmar Todos Gated por Checkbox Obrigatório */}
                <div className="pt-3 border-t border-amber-500/20 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 transition">
                    <input
                      type="checkbox"
                      checked={confirmAllChecked}
                      onChange={e => setConfirmAllChecked(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer flex-shrink-0"
                    />
                    <span className="text-[11px] text-amber-200 leading-snug">
                      Verifiquei que estes dados são reais e correspondem à minha empresa.
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!confirmAllChecked}
                    onClick={handleConfirmAll}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs transition shadow-sm min-h-[36px] flex items-center justify-center gap-1.5"
                  >
                    <span>✓</span>
                    <span>Confirmar todos</span>
                  </button>
                </div>
              </div>
            )}

            {/* Seletor Curado de Tipografia */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <strong className="text-slate-100 text-xs uppercase tracking-wider font-bold">
                  Tipografia da Marca
                </strong>
                <span className="text-[10px] text-slate-400">Só altera fontes</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <select
                  value={currentContent.customTypography || 'padrao'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'padrao') {
                      const updated = { ...currentContent };
                      delete updated.customTypography;
                      setCurrentContent(updated);
                      const newHtml = renderSiteTemplateV3(updated, true, true);
                      setCurrentHtml(newHtml);
                      onSiteUpdated?.(updated, newHtml);
                    } else {
                      handleApplyDirectOp({ op: 'set_typography', typographyId: val as any });
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="padrao">Padrão do Tema Atual</option>
                  <option value="moderna">Moderna (Inter - Sans-serif Limpo)</option>
                  <option value="classica">Clássica com Serifa (Playfair Display)</option>
                  <option value="elegante">Elegante (Cormorant Garamond)</option>
                  <option value="tecnica">Técnica & Estruturada (Outfit)</option>
                  <option value="redonda">Amigável & Redonda (Poppins)</option>
                </select>
              </div>
            </div>

            {/* Secção de Elementos Globais */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <strong className="text-slate-100 text-xs uppercase tracking-wider font-bold">
                  Elementos Globais
                </strong>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Sem custo de créditos
                </span>
              </div>

              <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                {[
                  { key: 'showCallButton', label: '📞 Botão de Chamada Telefónica' },
                  { key: 'showHeaderWa', label: '💬 WhatsApp no Cabeçalho' },
                  { key: 'showHeroWa', label: '💬 WhatsApp no Hero' },
                  { key: 'showStickyBar', label: '📌 Barra Fixa Inferior' },
                  { key: 'showWaForm', label: '📋 Formulário de WhatsApp' },
                  { key: 'showMap', label: '🗺️ Mapa de Localização' },
                  { key: 'showHeroVisualCard', label: '🛡️ Selo de Confiança do Hero' },
                  { key: 'showDraftBadge', label: '🏷️ Etiqueta de Prévia', disabledIfPending: true }
                ].map(item => {
                  const hasPending = Boolean(
                    (currentContent.placeholders_pending || 0) > 0 ||
                    (currentContent.placeholdersPending || 0) > 0 ||
                    currentContent.hasExampleData
                  );
                  const isDisabled = Boolean(item.disabledIfPending && hasPending);
                  const isChecked = (global as any)[item.key] !== false;
                  return (
                    <label
                      key={item.key}
                      className={`flex items-center justify-between py-1 ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      title={isDisabled ? 'Bloqueado: confirme primeiro os dados de exemplo acima.' : ''}
                    >
                      <span className="flex items-center gap-1.5">
                        {item.label}
                        {isDisabled && (
                          <span className="text-[9px] text-amber-400 font-normal">
                            (bloqueado)
                          </span>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => handleApplyDirectOp({ op: 'toggle', target: `global.${item.key}` })}
                        className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4 disabled:cursor-not-allowed"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Edição Rápida de Textos Chave */}
            <div>
              <strong className="text-slate-100 text-xs uppercase tracking-wider font-bold block mb-2">
                Textos dos Botões & Marca
              </strong>
              <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nome da Empresa</label>
                  <input
                    type="text"
                    value={currentContent.businessName || ''}
                    onChange={e => handleApplyDirectOp({ op: 'set', path: 'businessName', value: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Texto do Botão Hero</label>
                  <input
                    type="text"
                    value={global.heroWaText || ''}
                    placeholder="Ex: Marcar consulta / Reservar mesa"
                    onChange={e => handleApplyDirectOp({ op: 'set', path: 'global.heroWaText', value: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Secções e Reordenação */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <strong className="text-slate-100 text-xs uppercase tracking-wider font-bold">
                  Ordem e Visibilidade das Secções
                </strong>
                <span className="text-[10px] text-slate-500">Mover / Duplicar</span>
              </div>

              <div className="space-y-1.5">
                {sectionsOrder.map((secId, idx) => {
                  const sec = currentContent.sections?.[secId] || { title: secId, visible: true };
                  return (
                    <div
                      key={secId}
                      className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-slate-500 text-[11px] font-mono w-4">{idx + 1}</span>
                        <span className={`truncate text-xs font-medium ${sec.visible === false ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                          {sec.title || SECTION_LABELS[secId] || secId}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleApplyDirectOp({ op: 'move_section', fromIndex: idx, toIndex: idx - 1 })}
                            className="p-1 hover:text-white text-slate-400"
                            title="Subir secção"
                          >
                            ▲
                          </button>
                        )}
                        {idx < sectionsOrder.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleApplyDirectOp({ op: 'move_section', fromIndex: idx, toIndex: idx + 1 })}
                            className="p-1 hover:text-white text-slate-400"
                            title="Descer secção"
                          >
                            ▼
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleApplyDirectOp({ op: 'toggle', target: `sections.${secId}.visible` })}
                          className={`p-1 ${sec.visible === false ? 'text-amber-500' : 'text-slate-400 hover:text-white'}`}
                          title="Ocultar / Mostrar"
                        >
                          {sec.visible === false ? '👁️‍🗨️' : '👁️'}
                        </button>
                        {secId.startsWith('services') && (
                          <button
                            type="button"
                            onClick={() => handleApplyDirectOp({ op: 'duplicate_section', id: secId, newTitle: 'Pacotes & Planos' })}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-400 px-1.5 py-0.5 rounded border border-slate-700"
                            title="Duplicar secção"
                          >
                            ⧉ Duplicar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PAINEL DIREITO: PRÉVIA AO VIVO ULTRA-RESPONSIVA */}
      <div className="hidden md:flex flex-1 flex-col bg-slate-950 relative overflow-hidden">
        {/* Barra superior da Prévia */}
        <div className="h-13 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">
              Prévia Dinâmica do Site
            </span>
            <span className="text-xs text-slate-500 font-mono">
              /s/{slug}
            </span>
          </div>

          {/* Toggle Dispositivo */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700/80">
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`text-xs px-3 py-1 rounded-md transition font-medium ${
                previewDevice === 'mobile'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📱 Telemóvel (390px)
            </button>
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`text-xs px-3 py-1 rounded-md transition font-medium ${
                previewDevice === 'desktop'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🖥 Computador (100%)
            </button>
          </div>
        </div>

        {/* Área do Iframe */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-6 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
          <div
            className={`transition-all duration-300 ease-in-out bg-white shadow-2xl overflow-hidden ${
              previewDevice === 'mobile'
                ? 'w-[390px] h-[820px] rounded-[36px] border-[10px] border-slate-800 ring-1 ring-slate-700/80'
                : 'w-full h-full rounded-xl border border-slate-800'
            }`}
          >
            <iframe
              ref={iframeRef}
              title={`Prévia do site ${currentContent.businessName}`}
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-forms allow-popups"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
