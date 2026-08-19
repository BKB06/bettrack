# Política de segurança

## Versões suportadas

Somente a versão mais recente da branch `main` recebe correções de segurança.

## Como relatar uma vulnerabilidade

Não abra uma issue pública com detalhes exploráveis, dados pessoais ou credenciais. Use o recurso **Security → Report a vulnerability** do GitHub para enviar um relatório privado com:

- impacto observado;
- passos mínimos para reprodução;
- páginas ou arquivos afetados;
- sugestão de correção, se houver.

Remova dados reais e tokens de capturas de tela e exemplos.

## Modelo de segurança

- `firebase-config.js` contém a configuração web do Firebase e não deve conter chaves de conta de serviço.
- A configuração web chega ao navegador; o isolamento dos dados depende principalmente das regras do Firestore.
- Cada usuário só deve acessar `users/{uid}` quando o UID autenticado corresponder ao documento.
- Somente o conteúdo gerado em `dist/` pode ser publicado.
- Rascunhos, cache, histórico Git e arquivos de ambiente nunca devem fazer parte do deploy.
