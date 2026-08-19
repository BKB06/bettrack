# Roadmap do BetTrack

Esta lista organiza as próximas melhorias por impacto. Itens concluídos devem sair daqui e ser registrados no histórico de versões ou na pull request correspondente.

## Urgente — segurança e integridade

- [ ] Fazer um novo deploy pelo fluxo baseado em `dist/` e confirmar que `/.git/HEAD`, `/.git/config`, `/debug.html` e `/test.js` retornam `404`.
- [ ] Testar `firestore.rules` no Firebase Emulator com usuário anônimo, acesso ao próprio UID e tentativa de acesso cruzado.
- [ ] Decidir se o app será multiusuário ou restrito a contas autorizadas; para uso privado, adicionar allowlist ou custom claims.
- [ ] Trocar gravações do documento inteiro por transações do Firestore para impedir sobrescritas entre abas e dispositivos.
- [ ] Remover gradualmente handlers inline e montar conteúdo dinâmico com `createElement`/`textContent`, permitindo adotar uma CSP estrita.
- [ ] Ativar Firebase App Check, restrições de domínio/API na chave web e alertas de uso do projeto.
- [ ] Separar projetos/aliases Firebase de desenvolvimento e produção, com aprovação manual antes do deploy real.

## Alta prioridade — confiabilidade

- [ ] Mover apostas, movimentações e casas para subcoleções; o documento único pode atingir o limite do Firestore.
- [ ] Criar testes no Emulator para nova aposta, liquidação, reversão, exclusão e transferências concorrentes.
- [ ] Implementar exclusão lógica/arquivamento de casas para preservar todo o histórico.
- [ ] Adicionar exportação e importação de backup em JSON/CSV, com validação de esquema.
- [ ] Exibir mensagens de erro não bloqueantes no lugar de `alert` e `prompt`.
- [ ] Criar monitoramento de erros e registrar somente informações sem dados pessoais.

## Média prioridade — manutenção e experiência

- [ ] Extrair os controladores inline para módulos por página e mover o CSS de `logins.html` para o design system.
- [ ] Migrar do Firebase Compat para a SDK modular com dependências fixadas no lockfile.
- [ ] Fixar a versão do Firebase CLI usada em desenvolvimento e publicação.
- [ ] Carregar o OCR somente quando necessário e fixar uma versão exata do Tesseract.
- [ ] Completar a navegação por teclado, estados ARIA e testes de contraste em todas as telas.
- [ ] Adicionar testes de interface nos fluxos principais e nos breakpoints móvel, tablet e desktop.
- [ ] Padronizar a marca entre “BetTrack” e “BetTracker” e substituir o favicon provisório.
- [ ] Adicionar gráficos de evolução de banca, ROI por período, esporte, liga e casa.

## Ideias futuras

- [ ] PWA instalável com modo offline somente leitura.
- [ ] Metas de banca, limites de exposição e alertas configuráveis.
- [ ] Tags personalizadas e busca avançada de apostas.
- [ ] Importação assistida de bilhetes com revisão antes de salvar.
- [ ] Painel de auditoria para alterações financeiras.
