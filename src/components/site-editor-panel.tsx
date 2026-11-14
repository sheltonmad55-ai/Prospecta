'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SiteContent } from '@/server/site-template';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sectionsChanged?: string[];
  isStreaming?: boolean;
}

interface SiteEditorPanelProps {
  siteId: string;
  slug: string;
  initialContent: SiteContent;
  initialHtml: string;
  onClose: () => void;
  onSiteUpdated?: (content: SiteContent, html: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'Cabeçalho Principal (Hero)',
  services: 'Lista de Serviços / Especialidades',
  gallery: 'Galeria de Fotografias',
  about: 'História / Sobre a Empresa',
  reviews: 'Depoimentos / Avaliações',
  address: 'Localização e Contactos',
  whatsappMessage: 'Mensagem de WhatsApp'
};

export default function SiteEditorPanel({
  siteId,
  slug,
  initialContent,
  initialHtml,
  onClose,
  onSiteUpdated
}: SiteEditorPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Sou o seu assistente de design. O site para **${initialContent.businessName}** já está carregado no painel à direita.\n\nPode dar-me instruções como:\n• *"Mude o título principal para focar em exclusividade e atendimento rápido"*\n• *"Adicione 2 depoimentos de clientes satisfeitos"*\n• *"Mude a cor de destaque para verde esmeralda"*\n• *"Ajuste o texto do WhatsApp para pedir orçamento com agendamento"*\n\nCada ajuste é aplicado instantaneamente e atualiza a sua prévia.`
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentContent, setCurrentContent] = useState<SiteContent>(initialContent);
  const [currentHtml, setCurrentHtml] = useState<string>(initialHtml);
  const [streamingText, setStreamingText] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Atualizar o iframe via srcdoc para renderização ultra-rápida sem bloquear CSP de domínio
  useEffect(() => {
    if (iframeRef.current && currentHtml) {
      iframeRef.current.srcdoc = currentHtml;
    }
  }, [currentHtml]);

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
            } else if (data.type === 'done') {
              setStreamingText('');
              setCurrentContent(data.content);
              setCurrentHtml(data.html);

              const sectionsSummary = data.sections_changed && data.sections_changed.length > 0
                ? `\n\n🎯 **Secções atualizadas:** ${data.sections_changed.map((s: string) => SECTION_LABELS[s] || s).join(', ')}`
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950 text-slate-100 font-sans">
      {/* PAINEL ESQUERDO: CHAT IA INTERATIVO */}
      <div className="w-full md:w-[420px] lg:w-[460px] flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur">
        {/* Cabeçalho do Editor */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
              ✨
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                Editor Visual com IA
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                  Streaming
                </span>
              </div>
              <div className="text-xs text-slate-400 truncate max-w-[200px]">
                {currentContent.businessName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/s/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg transition"
              title="Abrir em nova aba"
            >
              Abrir ↗
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Fechar editor"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista de Mensagens */}
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
                      A processar melhorias em tempo real...
                    </div>
                    <div className="text-xs font-mono text-slate-400 line-clamp-3 bg-slate-900/60 p-2 rounded border border-slate-800">
                      {streamingText}
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-line">{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Atalhos Rápidos e Campo de Input */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 space-y-3">
          {/* Sugestões de 1 clique */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              'Tom mais sofisticado',
              'Adicionar 2 testemunhos',
              'Mudar cor para verde',
              'Destacar WhatsApp'
            ].map(sugg => (
              <button
                key={sugg}
                type="button"
                onClick={() => handleSendMessage(sugg)}
                disabled={isLoading}
                className="text-[11px] bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700/80 px-2.5 py-1 rounded-full transition disabled:opacity-50"
              >
                + {sugg}
              </button>
            ))}
          </div>

          {/* Textarea e Botão Enviar */}
          <div className="relative flex items-end gap-2 bg-slate-950 border border-slate-750 focus-within:border-blue-500 rounded-xl p-2 transition">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={2}
              placeholder="Diga à IA o que quer alterar no site..."
              className="w-full bg-transparent resize-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50 px-1"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim()}
              className="h-9 w-9 flex-shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center font-bold transition shadow-sm"
              title="Enviar instrução"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                '↑'
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>Pressione Enter para enviar</span>
            <span>1 crédito por ajuste</span>
          </div>
        </div>
      </div>

      {/* PAINEL DIREITO: PRÉVIA AO VIVO ULTRA-RESPONSIVA */}
      <div className="hidden md:flex flex-1 flex-col bg-slate-950 relative overflow-hidden">
        {/* Barra superior da Prévia */}
        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
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
              📱 Telemóvel (375px)
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
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
          <div
            className={`transition-all duration-300 ease-in-out bg-white shadow-2xl overflow-hidden ${
              previewDevice === 'mobile'
                ? 'w-[375px] h-[720px] rounded-[36px] border-[10px] border-slate-800 ring-1 ring-slate-700/80'
                : 'w-full h-full rounded-xl border border-slate-800'
            }`}
          >
            <iframe
              ref={iframeRef}
              title={`Prévia do site ${currentContent.businessName}`}
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

