# Patrimon — Inventário Patrimonial Inteligente

Sistema web/PWA para conferência de bens patrimoniais (Aviso 028/2026), 100% gratuito:
**site no GitHub Pages + banco de dados em tempo real no Firebase (plano gratuito do Google)**.
Quem usa só acessa o link — sem login, sem instalação obrigatória — e tudo que salvar
sincroniza na hora com os demais aparelhos.

## Stack e arquitetura (organizada e em boas práticas)
```
GitHub Pages (estático, branch main, pasta /site)
 ├─ patrimon.html ............. aplicação (UI + lógica + base de 888 bens embutida)
 ├─ config.js ................. ÚNICO ponto de configuração (chaves do Firebase)
 ├─ sw.js ..................... service worker (offline / cache versionado)
 ├─ manifest.webmanifest ...... PWA (instalável)
 └─ logo.png, favicon.ico, icon-*.png
Firebase (gratuito, plano Spark)
 ├─ Authentication (anônimo) .. identifica cada aparelho sem pedir senha
 └─ Firestore ................. coleções: conferencias / naoRelacionados / bensExtra
```
- **Local-first:** cada ação salva primeiro no aparelho e é enviada à nuvem em segundo plano.
  Sem internet, o trabalho continua e o Firestore envia as pendências sozinho quando a conexão volta.
- **Sem config no `config.js`, o sistema roda em modo local** (com exportar/importar backup) —
  ou seja, você pode publicar já e ativar a nuvem depois, sem risco.
- O selo no topo mostra o estado: **Sincronizado · Salvando… · Offline · Modo local**.

---

## PARTE 1 — Publicar no GitHub Pages (2 min)
1. No repositório **robertwvnascimento.github.io**, branch **main**, abra (ou crie) a pasta **`site/`**.
2. Envie **todos** os arquivos desta pasta para dentro de `site/` (Add file → Upload files → Commit).
   > Substitua os arquivos da versão anterior. As conferências já feitas nos celulares **não se perdem** (ficam no aparelho) e serão enviadas à nuvem automaticamente quando você concluir a Parte 2.
3. Acesse: **https://robertwvnascimento.github.io/site/patrimon.html** ✅ (já funciona, em modo local)

## PARTE 2 — Ativar a nuvem em tempo real (~10 min, uma única vez)
1. Entre em **https://console.firebase.google.com** com uma conta Google e clique em **Criar um projeto** → nome `patrimon` → pode desativar o Google Analytics → Criar.
2. Menu esquerdo **Criação → Authentication** → *Vamos começar* → aba **Sign-in method** → habilite **Anônimo** → Salvar.
3. Menu **Criação → Firestore Database** → *Criar banco de dados* → local `southamerica-east1 (São Paulo)` → iniciar no **modo de produção** → Criar.
4. Ainda no Firestore, aba **Regras**, apague tudo e cole as regras abaixo → **Publicar**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function aut() { return request.auth != null; }
    function txt(campo, max) {
      return request.resource.data[campo] is string && request.resource.data[campo].size() <= max;
    }
    match /conferencias/{pat} {
      allow read: if aut();
      allow write: if aut()
        && pat.matches('^[0-9]{6,14}$')
        && request.resource.data.st in ['POSSE','NLOC']
        && txt('setor',120) && txt('obs',1000) && txt('por',80)
        && request.resource.data.ts is number;
      allow delete: if aut();
    }
    match /naoRelacionados/{id} {
      allow read, delete: if aut();
      allow write: if aut()
        && txt('desc',300) && txt('pat',40) && txt('ent',20)
        && txt('setor',120) && txt('obs',1000) && txt('por',80)
        && request.resource.data.ts is number;
    }
    match /bensExtra/{pat} {
      allow read: if aut();
      allow create, update: if aut()
        && pat.matches('^[0-9]{6,14}$')
        && request.resource.data.row is list
        && request.resource.data.row.size() >= 14;
      allow delete: if false;
    }
    match /{tudo=**} { allow read, write: if false; }
  }
}
```
5. Volte à **Visão geral do projeto** → ícone **`</>` (Web)** → apelido `patrimon-web` → Registrar app.
   O Firebase mostra um bloco `const firebaseConfig = { apiKey: ... }`.
6. Abra o arquivo **`site/config.js`** no GitHub (lápis ✏️), troque `window.PATRIMON_CONFIG = null;` por:
```js
window.PATRIMON_CONFIG = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};
```
   (copiando os valores do bloco do Firebase) e faça o commit.
7. Recarregue o Patrimon: o selo no topo deve mudar para **● Sincronizado**. Pronto — a partir daí,
   qualquer alteração de qualquer pessoa aparece nos outros aparelhos em segundos, e o que já tinha
   sido conferido em modo local é enviado automaticamente.

### Segurança — leia antes de divulgar o link
- As chaves do `config.js` **não são segredo** (apenas identificam o projeto); quem protege o banco
  são as **regras acima**, que validam formato, tamanho e tipos de tudo que entra.
- Sem tela de login (requisito de "só acessar e usar"), **qualquer pessoa com o link consegue registrar
  conferências**. O risco é baixo (dados de inventário, link não indexado, tudo validado e com backup),
  mas se um dia quiser restringir, dá para trocar o login anônimo por e-mail/senha com contas criadas
  por você — me peça que eu gero essa versão.
- Rotina recomendada: **exportar a planilha completa 1x por dia** durante o inventário (backup natural).
- Repositórios `*.github.io` são públicos; a relação de bens fica visível a quem tiver o link
  (dados institucionais, sem dados pessoais além do nome da responsável, que já consta na relação oficial).

---

## Usando o Patrimon
- **Escanear:** código de barras lido automaticamente; botão **Ler número (OCR)** para etiquetas só
  com números; ou digite os últimos dígitos. Achou → ficha abre → **EM POSSE / NÃO LOCALIZADO**,
  setor (lista + "Outro"), observação, conferente → Salvar.
- **Novo bem:** bens físicos que não constam na relação (saem na aba `3-NÃO RELACIONADOS`).
- **Relatórios:** totais por status/entidade/setor + exportação **filtrada** ou **completa** —
  a completa mantém o formato original do Protheus (abas `1-PARâMETROS` e `2-RELAÇÃO`, mesmas
  colunas e patrimônios com zeros à esquerda) com as colunas de conferência ao final.
- **Dados → Importar planilha:** recebeu uma Relação nova do Protheus? Importe o .xlsx — o Patrimon
  confere item por item pelo nº de patrimônio (recuperando zeros à esquerda que o Excel corta),
  **não duplica nada** e cadastra só os bens novos, preservando todas as conferências. No modo online,
  os bens novos também sincronizam para toda a equipe.
- **Instalar como app:** botão **Instalar** no topo (Android/desktop) ou, no iPhone,
  Compartilhar → *Adicionar à Tela de Início*.

## Manutenção
- Ao publicar qualquer alteração nos arquivos, aumente `VERSAO` no `sw.js`
  (ex.: `patrimon-v3`) para os aparelhos baixarem a novidade.
- Limites do plano gratuito do Firebase (50 mil leituras e 20 mil gravações/dia): para 3 conferentes
  e ~900 bens, o uso do inventário inteiro fica muito abaixo disso.
