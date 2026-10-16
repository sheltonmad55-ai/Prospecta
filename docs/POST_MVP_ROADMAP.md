# Evolução após o MVP

Só avançar depois do fluxo principal ser confiável, útil e repetido por utilizadores reais. Valores e prazos abaixo são estimativas de planeamento para uma pessoa experiente; dependências comerciais podem ampliá-los.

## Gate de saída do piloto

Rever aproximadamente 60 empresas reais no Norte/Centro/Sul, fora apenas das capitais. Metas iniciais: 80% de registos identificáveis com categoria/local correcto, 50% de activação, 60% de utilidade percebida e 40% de retorno semanal. Registar amostras, entrevistas, respostas/propostas/vendas reportadas e custo por oportunidade. Não converter estes limiares em alegações publicitárias sem evidência.

| Fase | Valor e escopo | Dependências e mudanças | Aceitação e métricas | Esforço / custos / riscos |
|---|---|---|---|---|
| 1A — Receita local | Pacotes de créditos e planos com preços editáveis | Conta comerciante, provedor M-Pesa/e-Mola ou agregador autorizado; orders, payments, entitlements; webhooks/status verificados | Repetir notificações não duplica créditos; montante/moeda conferidos; reversões e reconciliação; medir conversão paga e margem | 2–4 semanas após acesso comercial; taxas do provedor e suporte; recorrência só se efectivamente suportada |
| 1B — Mini-portfólio | Perfil público, serviços, trabalhos e contacto | Storage, validação de ficheiros, publicação com revisão, slugs e ownership | Dono controla publicação; uploads perigosos bloqueados; medir uso e contacto reportado | 1–2 semanas; armazenamento/banda, abuso e dados de terceiros |
| 2 — Copilot e propostas | Respostas introduzidas manualmente, objecções, propostas/documentos, lembretes | threads, messages, proposals; consentimento/retenção; limites de IA | Sugestões editáveis, factos rastreáveis, sem envio autónomo; medir aceitação, utilidade e retenção | 2–4 semanas; tokens, geração de documentos e risco de conteúdo incorrecto |
| 3 — Agências | Convites, papéis, atribuição de leads, créditos partilhados e relatórios | memberships no repositório activo; convites expiráveis, revogação e auditoria | Testar escalada de privilégios, saída de membros e isolamento; medir uso por equipa e receita | 3–5 semanas; gestão de acesso, suporte, quotas e testes de segurança |
| 4 — Cobertura e evidências | Mais fontes licenciadas, alterações/frescura e auditorias seguras de sites | Contratos, retenção por origem, deduplicação humana, SSRF/sandbox nas auditorias | Medir precisão, actualidade, custo e cobertura por zona; scoring explica critérios sem prometer fecho | 3–6 semanas por conjunto de integrações; custo externo, termos, dados antigos |
| 5 — Mensageria oficial e escala | WhatsApp Business opcional, filas dimensionadas e monitorização | Onboarding de contas oficiais, permissões/consentimento/templates, webhooks e custos | Estados de entrega só do provedor; utilizador aprova conteúdo; medir falhas, custo e pedidos de exclusão | 3–6+ semanas, dependente de aprovação externa; limites e custos do provedor |

## Regras de progressão

Cada fase exige resultados de testes, critérios revistos com o proprietário, orçamento operacional e uma hipótese comercial clara. A faixa 500–1.500 MT é apenas uma hipótese de investigação. Não activar cobrança antes de confirmação efectiva no servidor; uma página de sucesso nunca concede créditos.

CSV exportado deve respeitar direitos da fonte e neutralizar fórmulas de folhas de cálculo. Contactos importados e mensagens de clientes exigem origem, finalidade e retenção definidas. Fontes sociais são autorizadas; não se extrai Instagram/WhatsApp por automação não aprovada.

Microserviços, Redis, múltiplas regiões de alojamento e aplicações nativas só devem ser introduzidos se métricas reais justificarem. Manter o modelo de workspace e a rastreabilidade dos créditos durante todas as migrações.
