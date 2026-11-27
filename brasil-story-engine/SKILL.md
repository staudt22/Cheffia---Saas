---
name: brasil-animated-story
description: Cria vídeos narrativos animados "E se…?" em PT-BR, 100% por código (Remotion + SVG), a partir de uma ideia curta. Gera roteiro, personagens, cenários, storyboard, animação, vozes, efeitos, música e render final.
---

# Brasil Animated Story Engine

Transforma uma frase ("E se todo brasileiro ganhasse R$ 1 milhão amanhã?") em um vídeo de YouTube pronto: animação 2D original feita por código, narração em segunda pessoa em português brasileiro natural, efeitos sonoros, trilha, legendas, thumbnail, título e descrição.

## Onde está a engine

Repositório **staudt22/Cheffia---Saas**, branch **`brasil-story-engine`**, pasta **`brasil-story-engine/`**.

1. Se a pasta já existir no ambiente (procure por `brasil-story-engine/package.json`), use-a.
2. Senão: `git clone -b brasil-story-engine --depth 1 https://github.com/staudt22/Cheffia---Saas bse-repo && cd bse-repo/brasil-story-engine`.
3. Primeira vez: `bash scripts/setup.sh` (npm, libs Python, modelos de voz Kokoro). Se o Chrome do sistema for usado: `export BSE_CHROME=$(which google-chrome || which chromium)`.
4. Antes de escrever código, leia `docs/ENGINE.md` (API), `docs/ESTILO.md` (identidade visual e de escrita) e `docs/PRODUCAO.md` (fases). O episódio `episodes/um-milhao/` é o exemplo de referência: copie os padrões dele.

## Regras fixas

- **Original sempre**: nunca copiar personagens, identidade visual, roteiros ou vídeos de canais existentes; nada de marcas, logos ou personagens de terceiros. Bancos, lojas e apps são fictícios.
- **Tudo por código e determinístico**: personagens (rigs de `src/characters`), cenários, objetos, movimento, efeitos e transições são programados. Sem vídeo gerado por IA, sem imagens estáticas como substituto de animação, sem `Math.random()`.
- **Áudio**: se o usuário **não enviar áudio**, gere tudo: narração (TTS), vozes de **cada personagem** com voz própria (`config/voices.json`), efeitos sonoros, ambientes e música (`scripts/audio/`). Se ele enviar, coloque em `episodes/<ep>/audio_in/` (`narration.*` = arquivo único, cortado automaticamente; `<idDaFala>.*` = fala específica) e gere com TTS só o que faltar. Música e efeitos continuam sendo gerados, salvo pedido em contrário. A voz deve ficar sempre clara (≥ 8 dB acima do fundo).
- **Consistência**: o elenco de `src/characters/cast.ts` nunca é redesenhado. Personagem novo = entrada nova no elenco.
- **Português brasileiro natural**, segunda pessoa, contando (não lendo). Siga a lista de proibições de `docs/ESTILO.md` (nada de "Olá pessoal", "neste vídeo vamos", frases genéricas de IA). Referências brasileiras do cotidiano, sem caricatura.
- **Fatos**: pesquise na web números atuais (IBGE, Banco Central, órgãos oficiais) antes de escrever; registre as fontes em `meta.json`.
- Produção completa por padrão: **8–15 min**. Se o usuário pedir curto/piloto, ~60 s.

## Autonomia × perguntas

Decida sozinho os detalhes criativos (tom, piadas, cenas, câmera, cores, música) e expanda ideias incompletas. **Pergunte ao usuário** (uma vez, com AskUserQuestion, antes de gastar horas de render) só quando houver dúvida real que mude o resultado:
- a ideia admite leituras bem diferentes (ex.: comédia × documental, público infantil × adulto);
- a duração ou o formato não estão claros e o pedido sugere algo fora do padrão;
- o tema envolve pessoa real, marca, tragédia ou assunto sensível;
- o usuário mencionou áudio, voz ou material que não chegou.
Se ninguém responder, siga a leitura mais razoável e diga qual foi.

## Fluxo (executar nesta ordem)

1. **IDEIA** → `npm run new-episode -- <slug> "<título>"`. Desenvolva a premissa e avalie de 1 a 5: curiosidade, thumbnail, título, storytelling, originalidade e viabilidade de animação. Preencha `meta.json` com título, 2 alternativas, descrição, tags e fontes.
2. **ROTEIRO** → `script.json`: atos HOOK → PREMISSA → PRIMEIRA FASE → ESCALADA → CONSEQUÊNCIAS → PROBLEMA CENTRAL → CLÍMAX → CONCLUSÃO → ÚLTIMA SURPRESA (campo `beat`). Cenas de 4–8 s, falas curtas, efeitos sonoros ancorados nas falas (`"at": "l07+0.4"`), `music` por ato, `ambience` por lugar. Calcule ~2,6 palavras/s; 10 min ≈ 1.600 palavras.
3. **PERSONAGENS / CENÁRIOS** → reutilize. Se criar, confira em `CharacterSheet` e `SceneGallery` com `node scripts/stills.mjs`.
4. **ÁUDIO** → `npm run audio -- <slug>`, que gera a timeline real a partir das vozes.
5. **STORYBOARD** → escreva `shots.tsx` (uma função por cena, usando `useLine` para sincronizar) → `npm run storyboard -- <slug>` → **abra e olhe `storyboards/<slug>/storyboard.jpg`** (Read). Corrija composição, enquadramento, personagens flutuando ou cortados e textos fora da tela **antes** de animar fino. Repita até ficar bom.
6. **ANIMAÇÃO** → movimento em toda cena (caminhar, gesticular, olhar, mudar expressão na palavra certa, mexer objetos, câmera, luz). Alterne plano geral, médio, close, detalhe, pan, zoom e tracking. Cortes só quando a narrativa muda. Teste com `npm run render -- <slug> --draft`.
7. **RENDER** → `npm run render -- <slug>` (1920×1080, 30 fps, AAC estéreo).
8. **REVISÃO** → `python3 scripts/review.py <slug>`, mais amostras de frames do MP4 (`ffmpeg -ss T -i out/<slug>/<slug>.mp4 -frames:v 1 x.jpg` a cada ~5 s, ver com Read). Corrija, renderize de novo e repita até o `review.md` sair limpo.
9. **ENTREGA** → `npm run deliver -- <slug>`. Envie ao usuário (SendUserFile): o MP4, `thumbnail.png`, `<slug>.pt-BR.srt`, `roteiro.md`, `youtube.txt` e o storyboard. Faça commit e push do episódio (script, shots, meta, timeline) na branch `brasil-story-engine`. Arquivos gerados pesados ficam fora do git.

Atalho, depois de prontos o roteiro e as cenas: `npm run make -- <slug>`.

## Problemas comuns

- Chrome não encontrado → `export BSE_CHROME=/caminho/do/chrome`, ou deixe o Remotion baixar (`npx remotion browser ensure`).
- Voz pronunciando errado → campo `"tts"` na fala com a grafia fonética.
- Cena dessincronizada após mudar o texto → rode `npm run audio` de novo; a animação lê os tempos novos.
- Render lento → `--draft` durante o desenvolvimento; o final só no fim.
- Episódios longos: escreva `shots.tsx` em blocos por ato e gere o storyboard por partes (`--shots s10,s11,…`).

Não entregue só instruções: construa, renderize, revise e entregue o vídeo.
