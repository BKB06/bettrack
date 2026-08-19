# Como contribuir

Obrigado por ajudar a melhorar o BetTrack.

## Ambiente local

1. Use Node.js 20 ou superior.
2. Execute `npm install`.
3. Copie `firebase-config.example.js` para `firebase-config.js` e use um projeto Firebase de desenvolvimento.
4. Execute `npm run dev` e abra o endereço informado.

O alias `default` do repositório aponta para o ambiente oficial apenas para o fluxo dos mantenedores. Em contribuições, selecione explicitamente um projeto de desenvolvimento com `npx firebase-tools use --add` e confirme o projeto ativo antes de qualquer deploy. Pull requests não devem publicar ambientes.

Nunca use dados reais de apostas, chaves de conta de serviço ou credenciais em testes e pull requests.

## Antes de abrir uma pull request

- Execute `npm run validate`.
- Teste manualmente a tela alterada em uma largura móvel e uma largura desktop.
- Mantenha comentários apenas quando explicarem uma regra, decisão ou efeito colateral relevante.
- Atualize o README ou o roadmap se o comportamento ou a configuração mudar.
- Prefira commits pequenos no formato `tipo: descrição`, por exemplo `fix: impedir saldo negativo`.

Consulte também [SECURITY.md](SECURITY.md) antes de relatar uma vulnerabilidade.
