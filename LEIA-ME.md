# Patrimon — Inventário Patrimonial Inteligente (v3)

Sistema web/PWA gratuito para o levantamento físico de bens (Aviso 028/2026):
**GitHub Pages (site) + Firebase (login, banco em tempo real e log de movimentações)**.

## Novidades desta versão
- **Login obrigatório** no modo online, com dois papéis: **Administrador** (acesso total) e
  **Colaborador** (tudo, exceto: importar planilha do Protheus, importar/mesclar backup,
  zona de risco e a tela de usuários).
- **Movimentações**: menu com o histórico de tudo (logins, conferências, exclusões, importações,
  exportações), com filtros por pessoa/patrimônio, tipo de ação e período.
- Bens **fora da relação** agora aparecem na aba **Itens** (chip "Fora da relação"), com ficha
  própria para editar/excluir, e viraram um card próprio nos Relatórios.
- Layout dos Relatórios corrigido no celular (filtros empilhados, tabelas com rolagem própria).
- Nome do sistema abaixo do logo; **botão voltar** do celular navega entre telas/fichas em vez
  de fechar o app.

## Arquivos
`patrimon.html` (app) · `config.js` (chaves do Firebase) · `sw.js` (offline) ·
`manifest.webmanifest` · `logo.png` · ícones/favicon · este LEIA-ME.

## PARTE 1 — Publicar (branch main)
1. Suba/substitua **todos** os arquivos na pasta **`site/`** do repositório `robertwvnascimento.github.io`.
2. Acesse **https://robertwvnascimento.github.io/site/patrimon.html**.
> Sem `config.js` preenchido o sistema roda em **modo local** (sem login, dados só no aparelho).

## PARTE 2 — Nuvem com login (refazer esta parte, uma única vez)

### 2.1 Ativar o login por e-mail/senha
Console do Firebase → **Authentication → Sign-in method** → habilite **E-mail/senha**.
(O provedor **Anônimo**, ativado na versão anterior, pode ser desativado — não é mais usado.)

### 2.2 Criar o PRIMEIRO administrador (você)
1. **Authentication → Users → Adicionar usuário** → seu e-mail + uma senha → Adicionar.
2. Na lista, copie o **UID** desse usuário.
3. **Firestore Database → Dados → Iniciar coleção** → ID da coleção: `usuarios` →
   ID do documento: **cole o UID** → campos:
   - `nome` (string) → seu nome
   - `email` (string) → seu e-mail
   - `papel` (string) → `admin`
   → Salvar.
> Os próximos usuários você cria **dentro do próprio Patrimon** (Menu → Usuários e permissões).

### 2.3 Publicar as NOVAS regras de segurança (substituem as antigas)
Firestore → aba **Regras** → apague tudo, cole e **Publicar**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function aut() { return request.auth != null; }
    function cadastrado() {
      return aut() && exists(/databases/$(database)/documents/usuarios/$(request.auth.uid));
    }
    function admin() {
      return cadastrado()
        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.papel == 'admin';
    }
    function txt(c, m) {
      return request.resource.data[c] is string && request.resource.data[c].size() <= m;
    }

    match /usuarios/{uid} {
      allow read: if aut() && (request.auth.uid == uid || admin());
      allow create, update: if admin()
        && txt('nome', 80) && txt('email', 120)
        && request.resource.data.papel in ['admin', 'colaborador'];
      allow delete: if admin();
    }

    match /conferencias/{pat} {
      allow read: if cadastrado();
      allow write: if cadastrado()
        && pat.matches('^[0-9]{6,14}$')
        && request.resource.data.st in ['POSSE', 'NLOC']
        && txt('setor', 120) && txt('obs', 1000) && txt('por', 80)
        && request.resource.data.ts is number;
      allow delete: if cadastrado();
    }

    match /naoRelacionados/{id} {
      allow read, delete: if cadastrado();
      allow write: if cadastrado()
        && txt('desc', 300) && txt('pat', 40) && txt('ent', 20)
        && txt('setor', 120) && txt('obs', 1000) && txt('por', 80)
        && request.resource.data.ts is number;
    }

    match /bensExtra/{pat} {
      allow read: if cadastrado();
      allow create, update: if admin()
        && pat.matches('^[0-9]{6,14}$')
        && request.resource.data.row is list
        && request.resource.data.row.size() >= 14;
      allow delete: if false;
    }

    match /logs/{id} {
      allow read: if cadastrado();
      allow create: if cadastrado()
        && txt('acao', 40) && txt('nome', 80) && txt('alvo', 60) && txt('det', 300)
        && request.resource.data.ts is number;
      allow update, delete: if false;
    }

    match /{tudo=**} { allow read, write: if false; }
  }
}
```
O que elas garantem **no servidor** (não só na tela): apenas usuários cadastrados em
`usuarios` leem/gravam; só **admin** mexe em usuários e na base importada (`bensExtra`);
o **log é imutável** (ninguém edita nem apaga movimentações); e todo dado gravado é
validado (formato do nº de patrimônio, tipos e tamanhos).

### 2.4 Chaves no config.js
`site/config.js` deve conter **apenas** isto (sem comentário em volta, sem linha `= null`):
```js
window.PATRIMON_CONFIG = {
  apiKey: "…", authDomain: "…", projectId: "…",
  storageBucket: "…", messagingSenderId: "…", appId: "…"
};
```
Recarregue o Patrimon 2× (por causa do cache offline). Deve aparecer a **tela de login** →
entre com o e-mail/senha do passo 2.2 → selo **● Sincronizado**.

## Dia a dia
- **Criar a equipe:** Menu → Usuários e permissões → nome, e-mail, senha provisória e papel.
  O colega entra com esses dados e pode trocar a senha em "Esqueci minha senha".
- **Movimentações:** Menu → Movimentações. Filtre por texto (pessoa, nº do patrimônio, detalhe),
  por ação ou por período. No modo online mostra as 500 mais recentes de toda a equipe.
- **Fora da relação:** cadastre em "Novo bem"; o item aparece em **Itens** (chip azul) —
  toque nele para editar ou excluir. Sai na aba `3-NÃO RELACIONADOS` da planilha exportada.
- Conferência, scanner, relatórios, exportação e importações funcionam como antes.

## Observações de segurança
- As restrições de colaborador são reforçadas no servidor onde importa (usuários e base
  importada só por admin; logs imutáveis). A "zona de risco" usa exclusões permitidas a
  usuários cadastrados — por isso ela só aparece para admin e fica registrada no log;
  mantenha o hábito de exportar a planilha/backup diariamente.
- A relação de bens embutida continua pública (repositório `*.github.io`); conferências,
  usuários e logs ficam no Firestore, acessíveis apenas com login.
- Ao publicar qualquer alteração, aumente `VERSAO` no `sw.js` (ex.: `patrimon-v5`).
