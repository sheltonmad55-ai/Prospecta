# Decisões de implementação

1. **SQLite local em vez de exigir Supabase para experimentar:** Node 24 já disponível; sem Docker ou credenciais fornecidas. Permite persistência e transacções reais, não apenas um protótipo no navegador. PostgreSQL continua o destino de produção a avaliar.
2. **Demo claramente identificada:** 44 empresas inventadas, sem telefones atribuídos a terceiros. Não se copiaram os contactos de exemplo nem estatísticas comerciais dos HTMLs.
3. **Análise determinística na demo:** funciona sem custos externos e não se faz passar por uma chamada de IA. O adaptador Gemini é activado apenas no modo real, sem fallback silencioso.
4. **Dados reais por importação ou dataset normalizado:** não executar scrapers sem configuração, autorização ou avaliação da cobertura. A integração Apify lê até 500 itens já existentes.
5. **Autenticação local para demo e Supabase para modo real:** papel administrativo local criado por acção demo explícita, ou concedido pelo operador. Nunca por metadata editável do utilizador.
6. **CSS local em vez do CDN Tailwind dos exemplos:** reduzir dependências de execução e preservar o desenho. Cores semânticas e fontes locais.
7. **Servidor Next no próprio processo:** o ambiente Windows restringe child_process. O build usa TypeScript API e workers em threads; não se desactivou a verificação de tipos.
8. **Pagamentos, portfólio e equipas depois da validação:** fronteiras previstas e roadmap documentado, sem botões que simulem pagamentos funcionais.

Documentação oficial consultada para ambiente e adaptadores: Next.js Installation, Supabase Auth server-side, Gemini generateContent e Apify Dataset Items. As chaves e serviços reais não foram usados nos testes.
