# XôPedras — controle de água (PWA)

App simples e offline para marcar cada garrafa que você bebe, acompanhar a meta diária e receber lembretes. Tudo roda no seu celular; **nenhum dado sai do navegador** (fica em `localStorage`).

O nome diz tudo: **xô, pedras!** 💧

## Arquivos (todos vão na raiz do repositório)

```
xopedras.html              <- abra este (NÃO se chama index, pra não conflitar)
xopedras.css
xopedras.js
xopedras-sw.js             <- service worker (escopo isolado: ./xopedras)
xopedras.webmanifest
xopedras-icon-192.png
xopedras-icon-512.png
xopedras-icon-maskable-512.png
xopedras-apple-touch.png
xopedras-favicon-32.png
xopedras-wordmark.png      <- logo horizontal (opcional, p/ usar onde quiser)
```

Todos os arquivos têm o prefixo `xopedras` justamente para **conviverem na mesma raiz** sem colidir com o seu `index.html` (e o css/js/sw dele).

## Publicar no GitHub Pages (branch `main`, raiz)

1. Envie os arquivos acima para a **raiz** do repositório, ao lado do seu `index.html` atual.
2. **Settings → Pages → Deploy from a branch → `main` / `/ (root)`** (se ainda não estiver assim).
3. O app fica em **`https://SEU-USUARIO.github.io/SEU-REPO/xopedras.html`**.

> O service worker e as notificações **exigem HTTPS** — o GitHub Pages já entrega HTTPS. Todos os caminhos são relativos, então funciona tanto na raiz do domínio quanto em subpasta de repositório.

### Por que não vai quebrar seu outro site

O service worker do XôPedras é registrado com **escopo `./xopedras`**, ou seja, ele só controla as páginas/arquivos que começam com `xopedras...`. Seu `index.html` (e o que mais houver na raiz) fica **fora** do alcance dele. Sem conflito.

## Instalar no Android (Realme 12 Pro+)

1. Abra `.../xopedras.html` no **Chrome**.
2. Aparece uma barra **"Instalar o XôPedras"** logo abaixo do topo — toque em **Instalar**. (Se você dispensar a barra, o botão continua disponível na engrenagem → **Instalar na tela inicial**. E sempre dá pra usar o menu **⋮ → Instalar app** do Chrome.)
3. Abra pelo ícone na tela inicial (tela cheia, sem barra do navegador).
4. Engrenagem → **Lembretes** → ative e aceite a permissão. Toque em **Enviar um lembrete de teste**.

> O botão "Instalar" só aparece quando o Chrome considera o app instalável (precisa de HTTPS + manifest + service worker, tudo já incluído) e quando ele ainda **não** está instalado. Em iPhone não existe esse botão: lá a instalação é via **Compartilhar → Adicionar à Tela de Início**.

### Para os lembretes não morrerem em segundo plano (importante na Realme UI)

A Realme UI / ColorOS é agressiva com bateria e mata tarefas em segundo plano — isso afeta **qualquer** app, inclusive o Chrome. Faça uma vez:

- **Ajustes → Apps → Chrome → Uso da bateria** → permita **execução em segundo plano** / desative a economia.
- Em alguns aparelhos: **Ajustes → Bateria → ⋮ → Otimização de bateria → Chrome → Não otimizar**.
- Se existir **Inicialização automática (Autostart)**, ative para o Chrome.
- Mantenha as **notificações do Chrome** ligadas no Android.

## Sobre o alcance dos lembretes (transparência técnica)

Como o site é estático (sem servidor), os lembretes usam a **Notification Triggers API** quando o aparelho suporta — nesse caso disparam **mesmo com o app fechado**. Onde a API não existe, o app cai num modo alternativo que só dispara **com o app aberto** (inclusive em segundo plano). O próprio app mostra qual modo está ativo na tela de ajustes.

Para lembretes 100% garantidos com o app fechado em qualquer aparelho, seria preciso **Web Push com um pequeno servidor** (chaves VAPID) — o que foge do "tudo na raiz do GitHub Pages". Dá pra fazer depois, se precisar.

## Personalizar

Tudo é editável na engrenagem: **meta diária** (vem em 5,0 L), **tamanho da garrafa** (vem em 800 ml), **intervalo** e **janela de horários** dos lembretes.

## Nota de saúde

5 L/dia é um volume alto. A orientação usual para prevenção de cálculos costuma mirar uma produção de ~2–2,5 L de urina/dia (geralmente ~2,5–3,5 L de líquidos), e ingerir grandes volumes muito rápido pode baixar o sódio. Confirme a meta exata com seu urologista — o app deixa o número configurável justamente por isso.
